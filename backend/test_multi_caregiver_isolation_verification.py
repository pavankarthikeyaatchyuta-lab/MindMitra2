import pytest
import uuid
from fastapi.testclient import TestClient
from main import app, get_db

client = TestClient(app)

def test_two_different_caregivers_complete_isolation():
    uid = uuid.uuid4().hex[:8]
    alpha_email = f"alpha_{uid}@mindmitra.com"
    beta_email = f"beta_{uid}@mindmitra.com"

    # 1. Register Caregiver Alpha
    alpha_resp = client.post("/api/auth/register", json={
        "name": "Caregiver Alpha",
        "email": alpha_email,
        "password": "Password123!"
    })
    assert alpha_resp.status_code == 200
    alpha_token = alpha_resp.json()["token"]
    alpha_headers = {"Authorization": f"Bearer {alpha_token}"}

    # Caregiver Alpha starts with NO profiles
    alpha_profiles_init = client.get("/api/profiles", headers=alpha_headers).json()
    assert len(alpha_profiles_init) == 0

    # 2. Register Caregiver Beta
    beta_resp = client.post("/api/auth/register", json={
        "name": "Caregiver Beta",
        "email": beta_email,
        "password": "Password123!"
    })
    assert beta_resp.status_code == 200
    beta_token = beta_resp.json()["token"]
    beta_headers = {"Authorization": f"Bearer {beta_token}"}

    # Caregiver Beta starts with NO profiles
    beta_profiles_init = client.get("/api/profiles", headers=beta_headers).json()
    assert len(beta_profiles_init) == 0

    # 3. Caregiver Alpha creates Grandpa and Grandma
    gpa_resp = client.post("/api/profiles", json={
        "name": "Grandpa Alpha",
        "age": 78,
        "preferred_language": "te",
        "voice_enabled": True
    }, headers=alpha_headers)
    assert gpa_resp.status_code == 200
    gpa_id = gpa_resp.json()["id"]

    gma_resp = client.post("/api/profiles", json={
        "name": "Grandma Alpha",
        "age": 75,
        "preferred_language": "hi",
        "voice_enabled": True
    }, headers=alpha_headers)
    assert gma_resp.status_code == 200
    gma_id = gma_resp.json()["id"]

    # 4. Caregiver Beta creates Father Beta
    father_resp = client.post("/api/profiles", json={
        "name": "Father Beta",
        "age": 68,
        "preferred_language": "en",
        "voice_enabled": False
    }, headers=beta_headers)
    assert father_resp.status_code == 200
    father_id = father_resp.json()["id"]

    # 5. Verify Caregiver Alpha sees ONLY Grandpa and Grandma
    alpha_profiles = client.get("/api/profiles", headers=alpha_headers).json()
    alpha_names = [p["name"] for p in alpha_profiles]
    assert "Grandpa Alpha" in alpha_names
    assert "Grandma Alpha" in alpha_names
    assert "Father Beta" not in alpha_names
    assert len(alpha_profiles) == 2

    # 6. Verify Caregiver Beta sees ONLY Father Beta
    beta_profiles = client.get("/api/profiles", headers=beta_headers).json()
    beta_names = [p["name"] for p in beta_profiles]
    assert "Father Beta" in beta_names
    assert "Grandpa Alpha" not in beta_names
    assert "Grandma Alpha" not in beta_names
    assert len(beta_profiles) == 1

    # 7. Add Familiar Person for Grandpa Alpha
    fp_resp = client.post("/api/familiar-people", json={
        "user_id": gpa_id,
        "name": "Anita (Daughter)",
        "relationship": "Daughter",
        "photo_url": "data:image/png;base64,iVBORw0KGgo=",
        "consent_confirmed": True
    }, headers=alpha_headers)
    assert fp_resp.status_code == 200

    # Caregiver Alpha can read Grandpa's familiar people
    alpha_fp = client.get(f"/api/familiar-people/{gpa_id}", headers=alpha_headers).json()
    assert len(alpha_fp) == 1
    assert alpha_fp[0]["name"] == "Anita (Daughter)"

    # Caregiver Beta is FORBIDDEN (403) from accessing Grandpa's familiar people
    beta_fp_forbidden = client.get(f"/api/familiar-people/{gpa_id}", headers=beta_headers)
    assert beta_fp_forbidden.status_code == 403

    # Caregiver Beta is FORBIDDEN (403) from accessing Grandpa's trends
    beta_trends_forbidden = client.get(f"/api/analytics/trends/{gpa_id}", headers=beta_headers)
    assert beta_trends_forbidden.status_code == 403

    # Caregiver Beta is FORBIDDEN (403) from accessing Grandpa's reminders
    beta_reminders_forbidden = client.get(f"/api/reminders/{gpa_id}", headers=beta_headers)
    assert beta_reminders_forbidden.status_code == 403

    # Caregiver Beta is FORBIDDEN (403) from deleting Grandpa
    beta_delete_forbidden = client.delete(f"/api/profiles/{gpa_id}", headers=beta_headers)
    assert beta_delete_forbidden.status_code == 403
