import io

from httpx import AsyncClient

from app.providers.virus_scan_provider import EICAR_SIGNATURE
from tests.conftest import (
    RecordingOtpProvider,
    login_and_verify,
    register_and_verify,
    unique_identifier,
)

CBC_TEXT = (
    "COMPLETE BLOOD COUNT\n"
    "Hemoglobin        13.5   g/dL   (13.0 - 17.0)\n"
    "WBC               15.5   10^3/µL   (4 - 11)\n"
    "Platelet Count    250    10^3/µL   (150 - 450)\n"
)


async def _upload(
    client: AsyncClient, *, filename: str = "cbc.txt", content: bytes, mime: str = "text/plain"
):
    files = {"file": (filename, io.BytesIO(content), mime)}
    return await client.post("/api/v1/reports/upload", files=files)


async def test_upload_and_process_extracts_results(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))

    resp = await _upload(client, content=CBC_TEXT.encode())
    assert resp.status_code == 201, resp.text
    report = resp.json()
    assert report["status"] in (
        "UPLOADED",
        "SCANNING",
        "PROCESSING",
        "EXTRACTING",
        "ANALYZING",
        "COMPLETED",
    )

    detail = await client.get(f"/api/v1/reports/{report['id']}")
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["status"] == "COMPLETED", body
    assert body["resultCount"] == 3
    assert "blood" in body["categories"]

    results = await client.get(f"/api/v1/reports/{report['id']}/results")
    assert results.status_code == 200, results.text
    by_test = {r["canonicalTestName"]: r for r in results.json()}
    assert by_test["Hemoglobin"]["value"] == 13.5
    assert by_test["Hemoglobin"]["status"]["direction"] == "NORMAL"
    assert by_test["White Blood Cell Count"]["value"] == 15.5
    # 15.5 is above the reference high of 11, band width 7 -> critical (>=50% over)
    assert by_test["White Blood Cell Count"]["status"]["direction"] in ("HIGH", "CRITICAL_HIGH")


async def test_upload_rejects_disallowed_extension(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    resp = await _upload(
        client, filename="report.exe", content=b"not a real report", mime="application/octet-stream"
    )
    assert resp.status_code == 422, resp.text


async def test_upload_rejects_content_that_does_not_match_extension(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    # .pdf extension but not actually a PDF (no %PDF magic bytes) — magic-byte
    # sniffing (§15) must catch this even though the extension looks fine.
    resp = await _upload(
        client, filename="report.pdf", content=b"\x00\x01totally not a pdf", mime="application/pdf"
    )
    assert resp.status_code == 422, resp.text


async def test_infected_upload_is_rejected_by_virus_scan(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    resp = await _upload(client, content=EICAR_SIGNATURE)
    assert resp.status_code == 201, resp.text
    report_id = resp.json()["id"]

    detail = await client.get(f"/api/v1/reports/{report_id}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["status"] == "FAILED"
    assert "malware" in detail.json()["failureReason"].lower()


async def test_document_with_no_recognizable_values_fails_cleanly(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    resp = await _upload(client, content=b"This document has no lab values in it at all.")
    assert resp.status_code == 201, resp.text
    detail = await client.get(f"/api/v1/reports/{resp.json()['id']}")
    assert detail.json()["status"] == "FAILED"


async def test_download_report_file_returns_original_bytes(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    resp = await _upload(client, filename="cbc.txt", content=CBC_TEXT.encode())
    report_id = resp.json()["id"]

    download = await client.get(f"/api/v1/reports/{report_id}/file")
    assert download.status_code == 200, download.text
    assert download.content == CBC_TEXT.encode()
    assert download.headers["content-type"].startswith("text/plain")
    assert 'filename="cbc.txt"' in download.headers["content-disposition"]


async def test_delete_report_removes_report_results_and_file(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    resp = await _upload(client, filename="cbc.txt", content=CBC_TEXT.encode())
    report_id = resp.json()["id"]

    detail = await client.get(f"/api/v1/reports/{report_id}")
    assert detail.json()["status"] == "COMPLETED"
    results = await client.get(f"/api/v1/reports/{report_id}/results")
    assert len(results.json()) == 3

    delete_resp = await client.delete(f"/api/v1/reports/{report_id}")
    assert delete_resp.status_code == 204, delete_resp.text

    assert (await client.get(f"/api/v1/reports/{report_id}")).status_code == 404
    assert (await client.get(f"/api/v1/reports/{report_id}/results")).status_code == 404
    assert (await client.get(f"/api/v1/reports/{report_id}/file")).status_code == 404

    listing = await client.get("/api/v1/reports")
    assert all(r["id"] != report_id for r in listing.json())


async def test_user_cannot_delete_another_users_report(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    patient_a = unique_identifier("patient-a")
    await register_and_verify(client, otp_provider, patient_a)
    resp = await _upload(client, content=CBC_TEXT.encode())
    report_id = resp.json()["id"]

    await client.post("/api/v1/auth/logout")
    await register_and_verify(client, otp_provider, unique_identifier("patient-b"))

    delete_resp = await client.delete(f"/api/v1/reports/{report_id}")
    assert delete_resp.status_code == 404

    await client.post("/api/v1/auth/logout")
    await login_and_verify(client, otp_provider, patient_a)
    assert (await client.get(f"/api/v1/reports/{report_id}")).status_code == 200


async def test_user_cannot_access_another_users_report(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    """§99 critical security test, applied to reports: patient B must get a
    404, never patient A's report metadata, results, or even confirmation
    that the report id exists."""
    await register_and_verify(client, otp_provider, unique_identifier("patient-a"))
    resp = await _upload(client, content=CBC_TEXT.encode())
    report_id = resp.json()["id"]

    await client.post("/api/v1/auth/logout")
    await register_and_verify(client, otp_provider, unique_identifier("patient-b"))

    detail = await client.get(f"/api/v1/reports/{report_id}")
    assert detail.status_code == 404

    results = await client.get(f"/api/v1/reports/{report_id}/results")
    assert results.status_code == 404

    file_download = await client.get(f"/api/v1/reports/{report_id}/file")
    assert file_download.status_code == 404

    listing = await client.get("/api/v1/reports")
    assert listing.status_code == 200
    assert all(r["id"] != report_id for r in listing.json())


async def test_trend_uses_previous_completed_report(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    first = await _upload(client, filename="first.txt", content=CBC_TEXT.encode())
    assert first.status_code == 201

    second_text = CBC_TEXT.replace("13.5", "12.0")
    second = await _upload(client, filename="second.txt", content=second_text.encode())
    assert second.status_code == 201

    results = await client.get(f"/api/v1/reports/{second.json()['id']}/results")
    by_test = {r["canonicalTestName"]: r for r in results.json()}
    assert by_test["Hemoglobin"]["value"] == 12.0
    assert by_test["Hemoglobin"]["previousValue"] == 13.5

    trends = await client.get("/api/v1/health/trends")
    assert trends.status_code == 200, trends.text
    hgb_trend = next(t for t in trends.json() if t["canonicalCode"] == "HGB")
    assert [p["value"] for p in hgb_trend["points"]] == [13.5, 12.0]


async def test_health_categories_and_category_detail(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    categories = await client.get("/api/v1/health/categories")
    assert categories.status_code == 200
    # Nothing uploaded yet — no category has any data, so none are shown.
    assert categories.json() == []

    await _upload(client, content=CBC_TEXT.encode())
    categories = await client.get("/api/v1/health/categories")
    ids = [c["id"] for c in categories.json()]
    assert ids == ["blood"]  # only the category this report actually has

    detail = await client.get("/api/v1/health/categories/blood")
    assert detail.status_code == 200, detail.text
    assert len(detail.json()["latestResults"]) == 3


async def test_attention_summary_reflects_latest_result_only(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    """A test that was abnormal in an older report shouldn't stay counted
    forever once a newer report shows it back in range — the count tracks
    current status, not report history."""
    await register_and_verify(client, otp_provider, unique_identifier("patient"))

    await _upload(
        client,
        filename="old.txt",
        content=(
            b"Collected On: 05-Jan-2025\n"
            b"Hemoglobin        9.0   g/dL   (13.0 - 17.0)\n"
        ),
    )
    summary = await client.get("/api/v1/health/attention-summary")
    assert summary.status_code == 200
    assert summary.json()["abnormalCount"] == 1
    assert [r["canonicalTestName"] for r in summary.json()["results"]] == ["Hemoglobin"]

    await _upload(
        client,
        filename="new.txt",
        content=(
            b"Collected On: 20-Jun-2025\n"
            b"Hemoglobin        13.5   g/dL   (13.0 - 17.0)\n"
        ),
    )
    summary = await client.get("/api/v1/health/attention-summary")
    assert summary.json()["abnormalCount"] == 0
    assert summary.json()["results"] == []


async def test_previous_value_updates_when_referenced_report_is_deleted(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    """"Trends from Previous Reports" reads each result's previous-value
    comparison — it must stay correct even after the report that supplied
    that comparison is deleted, not keep pointing at data that's gone."""
    await register_and_verify(client, otp_provider, unique_identifier("patient"))

    oldest = await _upload(
        client,
        filename="oldest.txt",
        content=b"Collected On: 01-Jan-2025\nHemoglobin        12.0   g/dL   (13.0 - 17.0)\n",
    )
    middle = await _upload(
        client,
        filename="middle.txt",
        content=b"Collected On: 05-Jan-2025\nHemoglobin        9.0   g/dL   (13.0 - 17.0)\n",
    )
    newest = await _upload(
        client,
        filename="newest.txt",
        content=b"Collected On: 20-Jun-2025\nHemoglobin        13.5   g/dL   (13.0 - 17.0)\n",
    )
    newest_id = newest.json()["id"]
    middle_id = middle.json()["id"]

    results = await client.get(f"/api/v1/reports/{newest_id}/results")
    assert results.json()[0]["previousValue"] == 9.0

    # Delete the report that supplied that comparison — the newest report's
    # results should automatically fall back to the next most recent report
    # (oldest, 12.0), not keep showing 9.0.
    delete = await client.delete(f"/api/v1/reports/{middle_id}")
    assert delete.status_code == 204

    results = await client.get(f"/api/v1/reports/{newest_id}/results")
    assert results.json()[0]["previousValue"] == 12.0

    oldest_id = oldest.json()["id"]
    await client.delete(f"/api/v1/reports/{oldest_id}")

    results = await client.get(f"/api/v1/reports/{newest_id}/results")
    assert results.json()[0]["previousValue"] is None


async def test_timeline_includes_completed_report(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    await _upload(client, content=CBC_TEXT.encode())
    timeline = await client.get("/api/v1/timeline")
    assert timeline.status_code == 200
    assert any(e["type"] == "LAB_REPORT" for e in timeline.json())


async def test_search_finds_uploaded_report_and_result(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    await _upload(client, filename="my-cbc-report.txt", content=CBC_TEXT.encode())

    by_filename = await client.get("/api/v1/search", params={"q": "my-cbc-report"})
    assert any(r["kind"] == "report" for r in by_filename.json())

    by_test = await client.get("/api/v1/search", params={"q": "Hemoglobin"})
    assert any(r["kind"] == "result" and r["title"] == "Hemoglobin" for r in by_test.json())
