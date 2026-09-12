from httpx import AsyncClient

from tests.conftest import RecordingOtpProvider, register_and_verify, unique_identifier


async def test_register_then_verify_creates_account(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    identifier = unique_identifier()
    body = await register_and_verify(client, otp_provider, identifier)

    user = body["user"]
    assert user["healthyId"].startswith("HLT-")
    assert user["email"] == identifier
    assert user["phone"] is None
    assert user["allergies"] == []


async def test_same_identifier_logs_back_into_same_account(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    identifier = unique_identifier()
    first = await register_and_verify(client, otp_provider, identifier)

    # A second OTP round for the same identifier (via /auth/login this time)
    # must resolve to the SAME account, not create a new one.
    await client.post("/api/v1/auth/login", json={"identifier": identifier})
    code = otp_provider.sent[identifier]
    second = await client.post(
        "/api/v1/auth/verify-otp", json={"identifier": identifier, "code": code}
    )
    assert second.status_code == 200
    assert second.json()["user"]["healthyId"] == first["user"]["healthyId"]


async def test_wrong_code_is_rejected(client: AsyncClient, otp_provider: RecordingOtpProvider):
    identifier = unique_identifier()
    await client.post("/api/v1/auth/register", json={"identifier": identifier})

    resp = await client.post(
        "/api/v1/auth/verify-otp", json={"identifier": identifier, "code": "000000"}
    )
    assert resp.status_code == 401
    assert "4 attempts left" in resp.json()["error"]["message"]


async def test_login_rejects_unregistered_identifier(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    identifier = unique_identifier()
    resp = await client.post("/api/v1/auth/login", json={"identifier": identifier})
    assert resp.status_code == 404
    assert identifier not in otp_provider.sent
    assert "No account found" in resp.json()["error"]["message"]


async def test_register_rejects_existing_identifier(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    identifier = unique_identifier()
    await register_and_verify(client, otp_provider, identifier)

    resp = await client.post("/api/v1/auth/register", json={"identifier": identifier})
    assert resp.status_code == 409
    assert "already exists" in resp.json()["error"]["message"]


async def test_otp_challenge_reports_expiry_window(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    identifier = unique_identifier()
    resp = await client.post("/api/v1/auth/register", json={"identifier": identifier})
    assert resp.status_code == 200
    assert resp.json()["expiresInSeconds"] == 60


async def test_me_requires_authentication(client: AsyncClient):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


async def test_me_returns_current_user(client: AsyncClient, otp_provider: RecordingOtpProvider):
    identifier = unique_identifier()
    await register_and_verify(client, otp_provider, identifier)

    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == identifier


async def test_update_profile_persists_fields(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    identifier = unique_identifier()
    await register_and_verify(client, otp_provider, identifier)

    resp = await client.patch(
        "/api/v1/users/me",
        json={
            "name": "Aarav Sharma",
            "bloodGroup": "O+",
            "allergies": ["Penicillin"],
            "emergencyContact": {
                "name": "Priya",
                "relationship": "Spouse",
                "phone": "+911234567890",
            },
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Aarav Sharma"
    assert body["bloodGroup"] == "O+"
    assert body["allergies"] == ["Penicillin"]
    assert body["emergencyContact"]["name"] == "Priya"


async def test_logout_invalidates_session(client: AsyncClient, otp_provider: RecordingOtpProvider):
    identifier = unique_identifier()
    await register_and_verify(client, otp_provider, identifier)

    logout_resp = await client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 204

    me_resp = await client.get("/api/v1/users/me")
    assert me_resp.status_code == 401


async def test_refresh_rotates_refresh_token_and_stays_authenticated(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    identifier = unique_identifier()
    await register_and_verify(client, otp_provider, identifier)

    # The refresh *token* always rotates (a fresh random value each call —
    # §10 "rotating refresh"). The access token JWT can legitimately come
    # out byte-identical if issued within the same second for the same
    # session (same claims + key), so that's not what's asserted here.
    old_refresh_cookie = client.cookies.get("hfy_refresh")
    refresh_resp = await client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    assert client.cookies.get("hfy_refresh") != old_refresh_cookie

    me_resp = await client.get("/api/v1/users/me")
    assert me_resp.status_code == 200

    me_resp = await client.get("/api/v1/users/me")
    assert me_resp.status_code == 200
