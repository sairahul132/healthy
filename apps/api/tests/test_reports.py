import io

from httpx import AsyncClient

from app.providers.virus_scan_provider import EICAR_SIGNATURE
from tests.conftest import RecordingOtpProvider, register_and_verify, unique_identifier

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
    ids = [c["id"] for c in categories.json()]
    assert "blood" in ids and "kidney" in ids

    await _upload(client, content=CBC_TEXT.encode())
    detail = await client.get("/api/v1/health/categories/blood")
    assert detail.status_code == 200, detail.text
    assert len(detail.json()["latestResults"]) == 3


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
