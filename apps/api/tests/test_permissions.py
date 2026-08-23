from httpx import AsyncClient

from tests.conftest import RecordingOtpProvider, register_and_verify, unique_identifier


async def test_create_role_returns_it_in_list(client: AsyncClient, otp_provider: RecordingOtpProvider):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))

    create = await client.post(
        "/api/v1/permissions/roles",
        json={"name": "Family Doctor", "categoryIds": ["blood", "heart"], "defaultDurationHours": 720},
    )
    assert create.status_code == 201, create.text
    role_id = create.json()["id"]
    assert set(create.json()["categoryIds"]) == {"blood", "heart"}

    listing = await client.get("/api/v1/permissions/roles")
    assert listing.status_code == 200, listing.text
    assert any(r["id"] == role_id for r in listing.json())


async def test_create_role_rejects_unknown_category(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    resp = await client.post(
        "/api/v1/permissions/roles",
        json={"name": "Bad", "categoryIds": ["not_a_category"], "defaultDurationHours": 24},
    )
    assert resp.status_code == 422, resp.text


async def test_update_role_name_only_leaves_categories_untouched(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    create = await client.post(
        "/api/v1/permissions/roles",
        json={"name": "Specialist", "categoryIds": ["kidney"], "defaultDurationHours": 168},
    )
    role_id = create.json()["id"]

    update = await client.patch(f"/api/v1/permissions/roles/{role_id}", json={"name": "Nephrologist"})
    assert update.status_code == 200, update.text
    assert update.json()["name"] == "Nephrologist"
    assert update.json()["categoryIds"] == ["kidney"]


async def test_update_role_categories_replaces_them(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    create = await client.post(
        "/api/v1/permissions/roles",
        json={"name": "Role", "categoryIds": ["kidney"], "defaultDurationHours": 24},
    )
    role_id = create.json()["id"]

    update = await client.patch(
        f"/api/v1/permissions/roles/{role_id}", json={"categoryIds": ["blood", "liver"]}
    )
    assert update.status_code == 200, update.text
    assert set(update.json()["categoryIds"]) == {"blood", "liver"}

    # updating again (e.g. re-saving the same categories) must not collide
    # with the unique (role_id, category) constraint from the prior scopes
    update2 = await client.patch(
        f"/api/v1/permissions/roles/{role_id}", json={"categoryIds": ["blood", "liver"]}
    )
    assert update2.status_code == 200, update2.text


async def test_delete_role_removes_it(client: AsyncClient, otp_provider: RecordingOtpProvider):
    await register_and_verify(client, otp_provider, unique_identifier("patient"))
    create = await client.post(
        "/api/v1/permissions/roles",
        json={"name": "Temp", "categoryIds": ["blood"], "defaultDurationHours": 24},
    )
    role_id = create.json()["id"]

    delete = await client.delete(f"/api/v1/permissions/roles/{role_id}")
    assert delete.status_code == 204

    listing = await client.get("/api/v1/permissions/roles")
    assert all(r["id"] != role_id for r in listing.json())


async def test_user_cannot_update_or_delete_another_users_role(
    client: AsyncClient, otp_provider: RecordingOtpProvider
):
    await register_and_verify(client, otp_provider, unique_identifier("patient-a"))
    create = await client.post(
        "/api/v1/permissions/roles",
        json={"name": "A's role", "categoryIds": ["blood"], "defaultDurationHours": 24},
    )
    role_id = create.json()["id"]

    await client.post("/api/v1/auth/logout")
    await register_and_verify(client, otp_provider, unique_identifier("patient-b"))

    update = await client.patch(f"/api/v1/permissions/roles/{role_id}", json={"name": "Hijacked"})
    assert update.status_code == 404

    delete = await client.delete(f"/api/v1/permissions/roles/{role_id}")
    assert delete.status_code == 404

    listing = await client.get("/api/v1/permissions/roles")
    assert listing.json() == []
