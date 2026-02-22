import pytest

PROFILE_PAYLOAD = {
    "height": 175.0,
    "weight": 75.0,
    "age": 30,
    "gender": "male",
    "activity_level": "moderate",
    "goal": "lose",
}


async def _register(client) -> str:
    res = await client.post("/auth/register", json={"email": "user@test.com", "password": "pass123"})
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_create_profile(client):
    token = await _register(client)
    res = await client.post(
        "/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["bmr"] > 0
    assert data["tdee"] > 0
    assert data["daily_target"] > 0
    # lose goal => daily_target = tdee - 500
    assert data["daily_target"] == pytest.approx(data["tdee"] - 500, rel=1e-3)


@pytest.mark.asyncio
async def test_create_profile_duplicate(client):
    token = await _register(client)
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})
    res = await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_get_profile(client):
    token = await _register(client)
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})
    res = await client.get("/profile", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["height"] == 175.0


@pytest.mark.asyncio
async def test_get_profile_not_found(client):
    token = await _register(client)
    res = await client.get("/profile", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_profile_requires_auth(client):
    res = await client.get("/profile")
    assert res.status_code == 403
