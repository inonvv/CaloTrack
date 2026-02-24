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
    # male lose goal: tdee - 500 is well above the 1500 floor
    assert data["daily_target"] == pytest.approx(data["tdee"] - 500, rel=1e-3)
    assert data["min_calories"] == 1500  # male


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


@pytest.mark.asyncio
async def test_update_goal(client):
    token = await _register(client)
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})

    res = await client.patch(
        "/profile", json={"goal": "gain"}, headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["goal"] == "gain"
    # gain: tdee + 300, well above male minimum 1500
    assert data["daily_target"] == pytest.approx(data["tdee"] + 300, rel=1e-3)


@pytest.mark.asyncio
async def test_update_goal_same_value(client):
    token = await _register(client)
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})

    res = await client.patch(
        "/profile", json={"goal": "lose"}, headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert res.json()["goal"] == "lose"


@pytest.mark.asyncio
async def test_update_goal_not_found(client):
    token = await _register(client)
    res = await client.patch(
        "/profile", json={"goal": "gain"}, headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_update_goal_requires_auth(client):
    res = await client.patch("/profile", json={"goal": "gain"})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_computed_bmi(client):
    token = await _register(client)
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})
    res = await client.get("/profile", headers={"Authorization": f"Bearer {token}"})
    # 75 / (1.75)^2 = 24.489... ≈ 24.5
    assert res.json()["bmi"] == pytest.approx(24.5, rel=1e-2)


@pytest.mark.asyncio
async def test_hydration_ml(client):
    token = await _register(client)
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})
    res = await client.get("/profile", headers={"Authorization": f"Bearer {token}"})
    # 75 kg × 35 ml = 2625
    assert res.json()["hydration_ml"] == 2625


@pytest.mark.asyncio
async def test_body_fat_requires_measurements(client):
    token = await _register(client)
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})
    res = await client.get("/profile", headers={"Authorization": f"Bearer {token}"})
    data = res.json()
    assert data["body_fat_pct"] is None
    assert data["lbm"] is None
    assert data["ffmi"] is None
    assert data["protein_min"] is None
    assert data["protein_max"] is None


@pytest.mark.asyncio
async def test_update_measurements(client):
    token = await _register(client)
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})
    res = await client.patch(
        "/profile",
        json={"waist_cm": 88.0, "neck_cm": 38.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["waist_cm"] == 88.0
    assert data["neck_cm"] == 38.0
    assert data["body_fat_pct"] is not None
    assert data["lbm"] is not None
    assert data["ffmi"] is not None
    assert data["protein_min"] is not None
    # goal unchanged
    assert data["goal"] == "lose"


@pytest.mark.asyncio
async def test_clear_measurements(client):
    token = await _register(client)
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})
    await client.patch(
        "/profile",
        json={"waist_cm": 88.0, "neck_cm": 38.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    # Clear waist → body fat becomes None again
    res = await client.patch(
        "/profile",
        json={"waist_cm": None},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["waist_cm"] is None
    assert data["body_fat_pct"] is None
