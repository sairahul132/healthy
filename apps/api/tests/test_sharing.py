from httpx import AsyncClient

from tests.conftest import RecordingOtpProvider, register_and_verify, unique_identifier

RECIPIENT_IDENTIFIER = "doctor@example.com"


async def _create_share(
    client: AsyncClient,
    otp_provider: RecordingOtpProvider,
    *,
    categories: list[str],
    recipient: str = RECIPIENT_IDENTIFIER,
    duration_hours: int = 24,
) -> dict:
    patient_identifier = unique_identifier("patient")
    await register_and_verify(client, otp_provider, patient_identifier)
    resp = await client.post(
        "/api/v1/sharing/sessions",
        json={
            "categoryIds": categories,
            "recipientIdentifier": recipient,
            "durationHours": duration_hours,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _extract_token(share_url: str) -> str:
    return share_url.rsplit("/", 1)[-1]


async def _authenticate_recipient(
    client: AsyncClient,
    otp_provider: RecordingOtpProvider,
    token: str,
    identifier: str = RECIPIENT_IDENTIFIER,
) -> str:
    """Runs the recipient OTP flow with a client that has NO patient cookies
    (a fresh AsyncClient sharing the same app/DB), returning the bearer
    share-access token."""
    await client.post(f"/api/v1/share/{token}/otp/request", json={"identifier": identifier})
    code = otp_provider.sent[identifier]
    resp = await client.post(
        f"/api/v1/share/{token}/otp/verify", json={"identifier": identifier, "code": code}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["accessToken"]


async def test_create_session_returns_share_url_with_token(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    session = await _create_share(client, otp_provider, categories=["blood", "heart"])
    assert session["status"] == "active"
    assert session["categoryIds"] == ["blood", "heart"]
    assert "/s/" in session["shareUrl"]
    assert session["recipientIdentifierMasked"] != RECIPIENT_IDENTIFIER


async def test_recipient_cannot_view_categories_without_otp(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    session = await _create_share(client, otp_provider, categories=["blood"])
    token = _extract_token(session["shareUrl"])

    resp = await client.get(f"/api/v1/share/{token}/categories")
    assert resp.status_code == 401


async def test_recipient_with_wrong_identity_is_rejected(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    session = await _create_share(client, otp_provider, categories=["blood"])
    token = _extract_token(session["shareUrl"])

    resp = await client.post(
        f"/api/v1/share/{token}/otp/request", json={"identifier": "someone-else@example.com"}
    )
    assert resp.status_code == 403


async def test_recipient_sees_only_granted_categories(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    session = await _create_share(client, otp_provider, categories=["blood", "heart"])
    token = _extract_token(session["shareUrl"])
    access_token = await _authenticate_recipient(client, otp_provider, token)

    resp = await client.get(
        f"/api/v1/share/{token}/categories", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert resp.status_code == 200
    authorized = {c["id"] for c in resp.json()["categories"] if c["authorized"]}
    assert authorized == {"blood", "heart"}


async def test_full_access_request_lifecycle(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    """The §100-shaped scenario: patient shares CBC-only (blood), doctor
    requests kidney, patient declines (still blocked), patient approves a
    second request (now visible), patient revokes (immediately blocked
    again) — all against one running session.
    """
    patient_identifier = unique_identifier("patient")
    await register_and_verify(client, otp_provider, patient_identifier)

    create_resp = await client.post(
        "/api/v1/sharing/sessions",
        json={
            "categoryIds": ["blood"],
            "recipientIdentifier": RECIPIENT_IDENTIFIER,
            "durationHours": 24,
        },
    )
    session = create_resp.json()
    session_id = session["id"]
    token = _extract_token(session["shareUrl"])

    access_token = await _authenticate_recipient(client, otp_provider, token)
    auth_header = {"Authorization": f"Bearer {access_token}"}

    categories_url = f"/api/v1/share/{token}/categories"
    requests_url = f"/api/v1/share/{token}/requests"
    kidney_request_body = {
        "category": "kidney",
        "reason": "Reviewing renal function",
        "requestedDurationHours": 48,
    }

    # 1. Doctor can't see kidney yet.
    categories = (await client.get(categories_url, headers=auth_header)).json()
    assert {c["id"]: c["authorized"] for c in categories["categories"]}["kidney"] is False

    # 2. Doctor requests kidney access.
    req_resp = await client.post(requests_url, headers=auth_header, json=kidney_request_body)
    assert req_resp.status_code == 201
    request_id = req_resp.json()["id"]

    # 3. Patient sees it pending.
    pending = (await client.get("/api/v1/sharing/requests?pendingOnly=true")).json()
    assert any(r["id"] == request_id and r["category"] == "kidney" for r in pending)

    # 4. Patient declines — doctor still blocked.
    decline_resp = await client.post(f"/api/v1/sharing/requests/{request_id}/decline")
    assert decline_resp.status_code == 204
    categories = (await client.get(categories_url, headers=auth_header)).json()
    assert {c["id"]: c["authorized"] for c in categories["categories"]}["kidney"] is False

    # 5. Doctor requests again, patient approves this time.
    req_resp_2 = await client.post(requests_url, headers=auth_header, json=kidney_request_body)
    request_id_2 = req_resp_2.json()["id"]
    approve_resp = await client.post(f"/api/v1/sharing/requests/{request_id_2}/approve")
    assert approve_resp.status_code == 204

    categories = (await client.get(categories_url, headers=auth_header)).json()
    assert {c["id"]: c["authorized"] for c in categories["categories"]}["kidney"] is True

    # 6. Patient revokes the whole session — doctor loses everything immediately.
    revoke_resp = await client.post(f"/api/v1/sharing/sessions/{session_id}/revoke")
    assert revoke_resp.status_code == 204

    blocked_resp = await client.get(categories_url, headers=auth_header)
    assert blocked_resp.status_code == 404


async def test_patient_cannot_revoke_another_patients_session(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    """Cross-user isolation (§99/§100): patient B must never be able to act
    on patient A's sharing session, even by guessing/knowing its id."""
    session_a = await _create_share(client, otp_provider, categories=["blood"])

    # Log out patient A, register patient B on the SAME client (shared
    # cookie jar — logging in again overwrites the session cookie).
    await client.post("/api/v1/auth/logout")
    await register_and_verify(client, otp_provider, unique_identifier("patient-b"))

    resp = await client.post(f"/api/v1/sharing/sessions/{session_a['id']}/revoke")
    assert resp.status_code == 404

    resp = await client.get("/api/v1/sharing/sessions")
    assert resp.json() == []  # patient B sees none of patient A's sessions


async def test_invalid_token_returns_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/share/not-a-real-token")
    assert resp.status_code == 404


async def test_cannot_request_access_to_already_granted_category(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    session = await _create_share(client, otp_provider, categories=["blood"])
    token = _extract_token(session["shareUrl"])
    access_token = await _authenticate_recipient(client, otp_provider, token)

    resp = await client.post(
        f"/api/v1/share/{token}/requests",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"category": "blood", "reason": "already have this", "requestedDurationHours": 24},
    )
    assert resp.status_code == 409


async def test_invalid_category_is_rejected_at_creation(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    patient_identifier = unique_identifier("patient")
    await register_and_verify(client, otp_provider, patient_identifier)

    resp = await client.post(
        "/api/v1/sharing/sessions",
        json={
            "categoryIds": ["not_a_real_category"],
            "recipientIdentifier": RECIPIENT_IDENTIFIER,
            "durationHours": 24,
        },
    )
    assert resp.status_code == 422
