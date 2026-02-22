import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    res = await client.post("/auth/register", json={"email": "test@test.com", "password": "secret123"})
    assert res.status_code == 201
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post("/auth/register", json={"email": "test@test.com", "password": "secret123"})
    res = await client.post("/auth/register", json={"email": "test@test.com", "password": "other"})
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/auth/register", json={"email": "test@test.com", "password": "secret123"})
    res = await client.post("/auth/login", json={"email": "test@test.com", "password": "secret123"})
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/auth/register", json={"email": "test@test.com", "password": "secret123"})
    res = await client.post("/auth/login", json={"email": "test@test.com", "password": "wrong"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    res = await client.post("/auth/login", json={"email": "nobody@test.com", "password": "x"})
    assert res.status_code == 401
