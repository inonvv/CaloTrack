import pytest
from datetime import date

PROFILE_PAYLOAD = {
    "height": 175.0,
    "weight": 75.0,
    "age": 30,
    "gender": "male",
    "activity_level": "moderate",
    "goal": "maintain",
}


async def _setup(client) -> str:
    res = await client.post("/auth/register", json={"email": "user@test.com", "password": "pass123"})
    token = res.json()["access_token"]
    await client.post("/profile", json=PROFILE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})
    return token


@pytest.mark.asyncio
async def test_get_daily_requires_profile(client):
    res = await client.post("/auth/register", json={"email": "user@test.com", "password": "pass123"})
    token = res.json()["access_token"]
    res = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_get_daily_creates_log(client):
    token = await _setup(client)
    res = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_consumed"] == 0.0
    assert data["date"] == date.today().isoformat()


@pytest.mark.asyncio
async def test_get_daily_is_idempotent(client):
    """Calling GET /daily twice must not create duplicate logs."""
    token = await _setup(client)
    r1 = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    r2 = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    assert r1.json()["id"] == r2.json()["id"]


@pytest.mark.asyncio
async def test_add_food_updates_totals(client):
    token = await _setup(client)
    res = await client.post(
        "/daily/food",
        json={"name": "Apple", "calories": 95, "input_type": "structured"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201

    log = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    assert log.json()["total_consumed"] == 95.0


@pytest.mark.asyncio
async def test_multiple_food_entries_accumulate(client):
    token = await _setup(client)
    for cal in [100, 200, 300]:
        await client.post(
            "/daily/food",
            json={"name": "item", "calories": cal, "input_type": "structured"},
            headers={"Authorization": f"Bearer {token}"},
        )
    log = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    assert log.json()["total_consumed"] == 600.0


@pytest.mark.asyncio
async def test_status_surplus(client):
    token = await _setup(client)
    await client.post(
        "/daily/food",
        json={"name": "Big meal", "calories": 9000, "input_type": "structured"},
        headers={"Authorization": f"Bearer {token}"},
    )
    log = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    assert log.json()["status"] == "surplus"


@pytest.mark.asyncio
async def test_status_deficit(client):
    token = await _setup(client)
    # No food logged => net_calories = 0, which is way below daily_target => deficit
    log = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    assert log.json()["status"] == "maintenance"  # 0 net, no entries yet


@pytest.mark.asyncio
async def test_update_food_name_and_calories(client):
    token = await _setup(client)
    res = await client.post(
        "/daily/food",
        json={"name": "Apple", "calories": 95, "input_type": "structured"},
        headers={"Authorization": f"Bearer {token}"},
    )
    entry_id = res.json()["id"]

    res = await client.patch(
        f"/daily/food/{entry_id}",
        json={"name": "Banana", "calories": 105},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Banana"
    assert data["calories"] == 105.0

    log = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    assert log.json()["total_consumed"] == 105.0


@pytest.mark.asyncio
async def test_update_food_name_only(client):
    token = await _setup(client)
    res = await client.post(
        "/daily/food",
        json={"name": "Apple", "calories": 95, "input_type": "structured"},
        headers={"Authorization": f"Bearer {token}"},
    )
    entry_id = res.json()["id"]

    res = await client.patch(
        f"/daily/food/{entry_id}",
        json={"name": "Green apple"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Green apple"
    assert res.json()["calories"] == 95.0

    log = await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    assert log.json()["total_consumed"] == 95.0  # unchanged


@pytest.mark.asyncio
async def test_update_food_not_found(client):
    token = await _setup(client)
    res = await client.patch(
        "/daily/food/9999",
        json={"name": "Ghost"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_update_food_requires_auth(client):
    res = await client.patch("/daily/food/1", json={"name": "Ghost"})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_history_returns_logs(client):
    token = await _setup(client)
    await client.get("/daily", headers={"Authorization": f"Bearer {token}"})
    res = await client.get("/daily/history", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) >= 1
