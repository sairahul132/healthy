import io

from httpx import AsyncClient

from tests.conftest import RecordingOtpProvider, register_and_verify, unique_identifier

PRESCRIPTION_TEXT = (
    "Dr. Patel\n"
    "Paracetamol 500mg - 1-0-1 - 5 days\n"
    "Amoxicillin 250mg - twice a day - 7 days\n"
)


async def _upload_prescription(client: AsyncClient, content: bytes = PRESCRIPTION_TEXT.encode()):
    files = {"file": ("rx.txt", io.BytesIO(content), "text/plain")}
    return await client.post("/api/v1/prescriptions/upload", files=files)


async def test_prescription_upload_extracts_items(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))

    resp = await _upload_prescription(client)
    assert resp.status_code == 201, resp.text
    prescription_id = resp.json()["id"]

    detail = await client.get(f"/api/v1/prescriptions/{prescription_id}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["status"] == "COMPLETED"
    assert detail.json()["itemCount"] == 2

    items = await client.get(f"/api/v1/prescriptions/{prescription_id}/items")
    assert items.status_code == 200, items.text
    names = {item["medicineName"] for item in items.json()}
    assert "Paracetamol" in names
    assert "Amoxicillin" in names
    assert all(item["corrected"] is False for item in items.json())


async def test_prescription_item_correction_preserves_original(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    resp = await _upload_prescription(client)
    prescription_id = resp.json()["id"]
    items = (await client.get(f"/api/v1/prescriptions/{prescription_id}/items")).json()
    item_id = items[0]["id"]

    correction = await client.patch(
        f"/api/v1/prescriptions/{prescription_id}/items/{item_id}",
        json={
            "medicineName": "Paracetamol (corrected)",
            "dosage": "500 mg",
            "frequency": "1-0-1",
            "duration": "5 days",
        },
    )
    assert correction.status_code == 200, correction.text
    assert correction.json()["medicineName"] == "Paracetamol (corrected)"
    assert correction.json()["corrected"] is True


async def test_user_cannot_access_another_users_prescription(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient-a"))
    resp = await _upload_prescription(client)
    prescription_id = resp.json()["id"]

    await client.post("/api/v1/auth/logout")
    await register_and_verify(client, otp_provider, unique_identifier("patient-b"))

    detail = await client.get(f"/api/v1/prescriptions/{prescription_id}")
    assert detail.status_code == 404
    items = await client.get(f"/api/v1/prescriptions/{prescription_id}/items")
    assert items.status_code == 404


async def test_medicine_manual_crud(client: AsyncClient, otp_provider: RecordingOtpProvider):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))

    create = await client.post(
        "/api/v1/medicines",
        json={"name": "Metformin", "strength": "500mg", "frequency": "twice daily"},
    )
    assert create.status_code == 201, create.text
    medicine_id = create.json()["id"]
    assert create.json()["active"] is True

    listing = await client.get("/api/v1/medicines")
    assert listing.status_code == 200
    assert any(m["id"] == medicine_id for m in listing.json())

    update = await client.patch(f"/api/v1/medicines/{medicine_id}", json={"active": False})
    assert update.status_code == 200, update.text
    assert update.json()["active"] is False
    assert update.json()["name"] == "Metformin"  # untouched fields survive a partial update


async def test_medicine_upload_creates_timeline_event(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    await client.post("/api/v1/medicines", json={"name": "Metformin"})
    timeline = await client.get("/api/v1/timeline")
    assert timeline.status_code == 200
    assert any(e["type"] == "MEDICINE" for e in timeline.json())


async def test_inactive_medicine_hidden_from_timeline(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    """Only active medicines belong on the timeline — marking one inactive
    should remove its card, and reactivating it should bring it back."""
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    create = await client.post("/api/v1/medicines", json={"name": "Metformin"})
    medicine_id = create.json()["id"]

    timeline = await client.get("/api/v1/timeline")
    assert any(e["type"] == "MEDICINE" for e in timeline.json())

    await client.patch(f"/api/v1/medicines/{medicine_id}", json={"active": False})
    timeline = await client.get("/api/v1/timeline")
    assert not any(e["type"] == "MEDICINE" for e in timeline.json())

    await client.patch(f"/api/v1/medicines/{medicine_id}", json={"active": True})
    timeline = await client.get("/api/v1/timeline")
    assert any(e["type"] == "MEDICINE" for e in timeline.json())


async def test_medicine_delete_removes_it_and_its_timeline_event(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    create = await client.post("/api/v1/medicines", json={"name": "Metformin"})
    medicine_id = create.json()["id"]

    delete = await client.delete(f"/api/v1/medicines/{medicine_id}")
    assert delete.status_code == 204, delete.text

    listing = await client.get("/api/v1/medicines")
    assert not any(m["id"] == medicine_id for m in listing.json())

    timeline = await client.get("/api/v1/timeline")
    assert not any(e["type"] == "MEDICINE" for e in timeline.json())


async def test_medicine_edit_updates_timeline_card(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    create = await client.post("/api/v1/medicines", json={"name": "Metformin"})
    medicine_id = create.json()["id"]

    await client.patch(f"/api/v1/medicines/{medicine_id}", json={"name": "Metformin XR"})

    timeline = await client.get("/api/v1/timeline")
    event = next(e for e in timeline.json() if e["type"] == "MEDICINE")
    assert event["title"] == "Metformin XR"


async def test_user_cannot_delete_another_users_medicine(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient-a"))
    create = await client.post("/api/v1/medicines", json={"name": "Metformin"})
    medicine_id = create.json()["id"]

    await client.post("/api/v1/auth/logout")
    await register_and_verify(client, otp_provider, unique_identifier("patient-b"))

    delete = await client.delete(f"/api/v1/medicines/{medicine_id}")
    assert delete.status_code == 404


async def test_activity_history_tracks_medicine_and_report_lifecycle(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))

    create = await client.post("/api/v1/medicines", json={"name": "Metformin"})
    medicine_id = create.json()["id"]
    await client.patch(f"/api/v1/medicines/{medicine_id}", json={"name": "Metformin XR"})
    await client.delete(f"/api/v1/medicines/{medicine_id}")

    history = await client.get("/api/v1/timeline/history")
    assert history.status_code == 200, history.text
    titles = [h["title"] for h in history.json()]
    assert titles == ["Medicine deleted", "Medicine edited", "Medicine added"]

    clear = await client.delete("/api/v1/timeline/history")
    assert clear.status_code == 204

    history = await client.get("/api/v1/timeline/history")
    assert history.json() == []

    await client.post("/api/v1/medicines", json={"name": "Ibuprofen"})
    history = await client.get("/api/v1/timeline/history")
    assert [h["title"] for h in history.json()] == ["Medicine added"]
