import io

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.security import hmac_lookup_hash
from app.db.models import DoctorProfile
from app.db.models.doctor_profile import DoctorVerificationStatus
from tests.conftest import RecordingOtpProvider, register_and_verify, unique_identifier

CBC_TEXT = "Hemoglobin        13.5   g/dL   (13.0 - 17.0)\n"


async def _verify_doctor(test_engine, identifier: str) -> None:
    """Stands in for the operator-run scripts/verify_doctor.py, against the
    same in-memory test engine the `client` fixture uses."""
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as db:
        identity_hash = hmac_lookup_hash(identifier)
        from app.db.models import UserIdentity

        identity = (
            await db.execute(
                select(UserIdentity).where(UserIdentity.identity_value_hash == identity_hash)
            )
        ).scalar_one()
        profile = (
            await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == identity.user_id))
        ).scalar_one()
        profile.verification_status = DoctorVerificationStatus.VERIFIED
        await db.commit()


async def test_doctor_registration_starts_pending(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("doctor"))
    resp = await client.post(
        "/api/v1/doctors/register",
        json={
            "fullName": "Dr. Sharma",
            "registrationNumber": "MCI-12345",
            "organization": "City Hospital",
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["verificationStatus"] == "pending"

    me = await client.get("/api/v1/doctors/me")
    assert me.status_code == 200
    assert me.json()["verificationStatus"] == "pending"


async def test_unverified_doctor_cannot_list_patients(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("doctor"))
    await client.post(
        "/api/v1/doctors/register",
        json={"fullName": "Dr. Sharma", "registrationNumber": "MCI-1", "organization": "Clinic"},
    )
    resp = await client.get("/api/v1/doctors/patients")
    assert resp.status_code == 403


async def test_verified_doctor_sees_linked_patient_and_authorized_results(
    client: AsyncClient, otp_provider: RecordingOtpProvider, test_engine
):
    doctor_identifier = unique_identifier("doctor")

    # Doctor registers (still logged in as the doctor for this part).
    await register_and_verify(client, otp_provider, doctor_identifier)
    await client.post(
        "/api/v1/doctors/register",
        json={"fullName": "Dr. Sharma", "registrationNumber": "MCI-1", "organization": "Clinic"},
    )
    await _verify_doctor(test_engine, doctor_identifier)
    await client.post("/api/v1/auth/logout")

    # Patient uploads a report and shares blood-category access with the doctor's identifier.
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    upload = await client.post(
        "/api/v1/reports/upload",
        files={"file": ("cbc.txt", io.BytesIO(CBC_TEXT.encode()), "text/plain")},
    )
    assert upload.status_code == 201, upload.text

    create_resp = await client.post(
        "/api/v1/sharing/sessions",
        json={
            "categoryIds": ["blood"],
            "recipientIdentifier": doctor_identifier,
            "durationHours": 24,
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    share_url = create_resp.json()["shareUrl"]
    token = share_url.rsplit("/", 1)[-1]
    await client.post("/api/v1/auth/logout")

    # Recipient (not yet logged in as anyone) verifies as the doctor's identifier —
    # this is what links the session to the doctor's persistent account.
    await client.post(f"/api/v1/share/{token}/otp/request", json={"identifier": doctor_identifier})
    code = otp_provider.sent[doctor_identifier]
    verify = await client.post(
        f"/api/v1/share/{token}/otp/verify", json={"identifier": doctor_identifier, "code": code}
    )
    assert verify.status_code == 200, verify.text

    # Doctor logs back in with their own persistent session and checks the dashboard.
    await register_and_verify(client, otp_provider, doctor_identifier)
    patients = await client.get("/api/v1/doctors/patients")
    assert patients.status_code == 200, patients.text
    assert len(patients.json()) == 1
    session_id = patients.json()[0]["sessionId"]
    assert patients.json()[0]["categoryIds"] == ["blood"]

    categories = await client.get(f"/api/v1/doctors/patients/{session_id}/categories")
    assert categories.status_code == 200
    authorized = {c["id"]: c["authorized"] for c in categories.json()["categories"]}
    assert authorized["blood"] is True
    assert authorized["kidney"] is False

    results = await client.get(f"/api/v1/doctors/patients/{session_id}/categories/blood/results")
    assert results.status_code == 200, results.text
    assert any(r["canonicalTestName"] == "Hemoglobin" for r in results.json())

    blocked = await client.get(f"/api/v1/doctors/patients/{session_id}/categories/kidney/results")
    assert blocked.status_code == 403


async def test_doctor_cannot_see_another_doctors_patient_session(
    client: AsyncClient, otp_provider: RecordingOtpProvider, test_engine
):
    doctor_a = unique_identifier("doctor-a")
    doctor_b = unique_identifier("doctor-b")

    for doctor in (doctor_a, doctor_b):
        await register_and_verify(client, otp_provider, doctor)
        await client.post(
            "/api/v1/doctors/register",
            json={"fullName": "Dr.", "registrationNumber": "X", "organization": "Y"},
        )
        await _verify_doctor(test_engine, doctor)
        await client.post("/api/v1/auth/logout")

    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    create_resp = await client.post(
        "/api/v1/sharing/sessions",
        json={"categoryIds": ["blood"], "recipientIdentifier": doctor_a, "durationHours": 24},
    )
    token = create_resp.json()["shareUrl"].rsplit("/", 1)[-1]
    await client.post("/api/v1/auth/logout")

    await client.post(f"/api/v1/share/{token}/otp/request", json={"identifier": doctor_a})
    code = otp_provider.sent[doctor_a]
    await client.post(
        f"/api/v1/share/{token}/otp/verify", json={"identifier": doctor_a, "code": code}
    )

    await register_and_verify(client, otp_provider, doctor_a)
    session_id = (await client.get("/api/v1/doctors/patients")).json()[0]["sessionId"]
    await client.post("/api/v1/auth/logout")

    await register_and_verify(client, otp_provider, doctor_b)
    resp = await client.get(f"/api/v1/doctors/patients/{session_id}/categories")
    assert resp.status_code == 404
