import pytest
from fastapi.testclient import TestClient
from main import app, init_db, get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_familiar_person_full_lifecycle_and_isolation():
    # 1. Register and login Caregiver A
    email_a = f"caregiver_fp_a_{id(object())}@test.com"
    reg_a = client.post("/api/auth/register", json={
        "name": "Caregiver A",
        "email": email_a,
        "password": "Password123!"
    })
    assert reg_a.status_code == 200
    token_a = reg_a.json()["token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Caregiver A creates Senior Profile A1
    prof_res_a1 = client.post("/api/profiles", json={
        "name": "Senior A1",
        "age": 75,
        "preferred_language": "en",
        "voice_enabled": True
    }, headers=headers_a)
    assert prof_res_a1.status_code == 200
    profile_a1_id = prof_res_a1.json()["id"]

    # Caregiver A creates Senior Profile A2
    prof_res_a2 = client.post("/api/profiles", json={
        "name": "Senior A2",
        "age": 72,
        "preferred_language": "hi",
        "voice_enabled": True
    }, headers=headers_a)
    assert prof_res_a2.status_code == 200
    profile_a2_id = prof_res_a2.json()["id"]

    # 3. Add Familiar Person for Profile A1
    sample_photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    add_res = client.post("/api/familiar-people", json={
        "user_id": profile_a1_id,
        "name": "Rohan (Grandson)",
        "relationship": "Grandson",
        "photo_url": sample_photo,
        "consent_confirmed": True
    }, headers=headers_a)
    assert add_res.status_code == 200
    fp_data = add_res.json()
    assert fp_data["id"] > 0
    assert fp_data["name"] == "Rohan (Grandson)"
    assert fp_data["relationship"] == "Grandson"
    assert fp_data["consent_confirmed"] is True
    fp_id = fp_data["id"]

    # 4. Fetch familiar people for Profile A1 -> Person is present
    get_res_a1 = client.get(f"/api/familiar-people/{profile_a1_id}", headers=headers_a)
    assert get_res_a1.status_code == 200
    people_a1 = get_res_a1.json()
    assert len(people_a1) == 1
    assert people_a1[0]["id"] == fp_id
    assert people_a1[0]["name"] == "Rohan (Grandson)"

    # 5. Fetch familiar people for Profile A2 -> Person is NOT present (isolated per profile)
    get_res_a2 = client.get(f"/api/familiar-people/{profile_a2_id}", headers=headers_a)
    assert get_res_a2.status_code == 200
    people_a2 = get_res_a2.json()
    assert len(people_a2) == 0

    # 6. Update Familiar Person (PUT/PATCH)
    update_res = client.put(f"/api/familiar-people/{fp_id}", json={
        "name": "Rohan Kumar",
        "relationship": "Eldest Grandson",
        "consent_confirmed": True
    }, headers=headers_a)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["name"] == "Rohan Kumar"
    assert updated_data["relationship"] == "Eldest Grandson"

    # 7. Register and login Caregiver B (Different Account)
    email_b = f"caregiver_fp_b_{id(object())}@test.com"
    reg_b = client.post("/api/auth/register", json={
        "name": "Caregiver B",
        "email": email_b,
        "password": "Password123!"
    })
    assert reg_b.status_code == 200
    token_b = reg_b.json()["token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 8. Unauthorized Caregiver B attempts to view, edit, add, or delete Caregiver A's familiar person -> 403 Forbidden
    unauth_get = client.get(f"/api/familiar-people/{profile_a1_id}", headers=headers_b)
    assert unauth_get.status_code == 403

    unauth_add = client.post("/api/familiar-people", json={
        "user_id": profile_a1_id,
        "name": "Intruder",
        "relationship": "None",
        "photo_url": sample_photo,
        "consent_confirmed": True
    }, headers=headers_b)
    assert unauth_add.status_code == 403

    unauth_put = client.put(f"/api/familiar-people/{fp_id}", json={
        "name": "Hacked Name"
    }, headers=headers_b)
    assert unauth_put.status_code == 403

    unauth_del = client.delete(f"/api/familiar-people/{fp_id}", headers=headers_b)
    assert unauth_del.status_code == 403

    # 9. Authorized Caregiver A deletes familiar person
    del_res = client.delete(f"/api/familiar-people/{fp_id}", headers=headers_a)
    assert del_res.status_code == 200

    # 10. Verify deletion
    get_res_after = client.get(f"/api/familiar-people/{profile_a1_id}", headers=headers_a)
    assert get_res_after.status_code == 200
    assert len(get_res_after.json()) == 0
