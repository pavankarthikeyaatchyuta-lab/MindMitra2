import pytest
from fastapi.testclient import TestClient
from main import app, init_db, get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_full_caregiver_authentication_lifecycle():
    unique_email = f"caregiver_auth_test_{id(object())}@mindmitra.com"
    password = "SecurePassword123!"

    # 1. Register a NEW caregiver account
    reg_res = client.post("/api/auth/register", json={
        "name": "Test Caregiver",
        "email": unique_email,
        "password": password
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "token" in reg_data
    assert reg_data["caregiver"]["email"] == unique_email.lower()
    caregiver_id = reg_data["caregiver"]["id"]

    # 2. Attempt duplicate registration -> 409 Conflict
    dup_res = client.post("/api/auth/register", json={
        "name": "Duplicate Caregiver",
        "email": unique_email,
        "password": password
    })
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"]

    # 3. Login with wrong password -> 401 Unauthorized
    wrong_pwd_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "WrongPassword123!"
    })
    assert wrong_pwd_res.status_code == 401
    assert "incorrect" in wrong_pwd_res.json()["detail"]

    # 4. Login with correct credentials -> 200 OK
    login_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": password
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    token = login_data["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 5. Validate session token via /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["caregiver"]["id"] == caregiver_id

    # 6. Add elderly profile under this caregiver
    prof_res = client.post("/api/profiles", json={
        "name": "Senior Member 1",
        "age": 74,
        "preferred_language": "en",
        "voice_enabled": True
    }, headers=headers)
    assert prof_res.status_code == 200
    profile_id = prof_res.json()["id"]

    # 7. Add familiar person under profile
    photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    fp_res = client.post("/api/familiar-people", json={
        "user_id": profile_id,
        "name": "Family Member",
        "relationship": "Daughter",
        "photo_url": photo,
        "consent_confirmed": True
    }, headers=headers)
    assert fp_res.status_code == 200
    fp_id = fp_res.json()["id"]

    # 8. Re-login after logout simulation
    relogin_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": password
    })
    assert relogin_res.status_code == 200
    new_token = relogin_res.json()["token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}

    # 9. Verify profile persists and belongs to caregiver
    profiles_res = client.get("/api/profiles", headers=new_headers)
    assert profiles_res.status_code == 200
    user_profiles = profiles_res.json()
    assert any(p["id"] == profile_id for p in user_profiles)

    # 10. Verify familiar person persists under profile
    fp_get_res = client.get(f"/api/familiar-people/{profile_id}", headers=new_headers)
    assert fp_get_res.status_code == 200
    people = fp_get_res.json()
    assert len(people) == 1
    assert people[0]["id"] == fp_id
    assert people[0]["name"] == "Family Member"
