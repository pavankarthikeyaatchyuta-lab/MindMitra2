import pytest
import sqlite3
import json
from fastapi.testclient import TestClient
import os
import sys

sys.path.append(os.path.dirname(__file__))
from main import app, init_db
from services.auth_service import hash_password, verify_password, create_access_token, decode_access_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    client.post("/api/demo/seed")

def test_caregiver_auth_and_token():
    # 1. Login with valid credentials
    resp = client.post("/api/auth/login", json={
        "email": "pavan@mindmitra.com",
        "password": "mindmitra123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["caregiver"]["email"] == "pavan@mindmitra.com"

    # 2. Login with invalid password
    bad_resp = client.post("/api/auth/login", json={
        "email": "pavan@mindmitra.com",
        "password": "wrongpassword"
    })
    assert bad_resp.status_code == 401

    # 3. Verify /api/auth/me
    token = data["token"]
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert len(me_data["profiles"]) >= 2

def test_elderly_profiles_creation():
    # Create new elderly profile
    resp = client.post("/api/profiles", json={
        "name": "Kamala Devi",
        "age": 75,
        "preferred_language": "te",
        "voice_enabled": True
    })
    assert resp.status_code == 200
    p = resp.json()
    assert p["name"] == "Kamala Devi"
    assert p["age"] == 75
    new_id = p["id"]

    # Verify new profile has 0 sessions and unestablished baseline
    baseline_resp = client.get(f"/api/analytics/baseline/{new_id}/memory_match")
    assert baseline_resp.status_code == 200
    b_data = baseline_resp.json()
    assert b_data["sufficient_data"] is False
    assert b_data["sessions_used"] == 0

def test_profile_data_isolation():
    # Profile 1: Rajesh Kumar (8 sessions)
    # Profile 2: Sunita Devi (7 sessions)
    rajesh_trends = client.get("/api/analytics/trends/1").json()
    sunita_trends = client.get("/api/analytics/trends/2").json()

    # Verify baseline and trends are completely separate
    assert len(rajesh_trends) == 4
    assert len(sunita_trends) == 4

    # Rajesh is Stable across all 4
    assert all(t["trend"] == "stable" for t in rajesh_trends)

    # Sunita has Recent Change on memory_match & daily_routine
    sunita_mem = next(t for t in sunita_trends if t["game_type"] == "memory_match")
    assert sunita_mem["trend"] == "recent_change"

    # Familiar People Isolation
    rajesh_people = client.get("/api/familiar-people/1").json()
    sunita_people = client.get("/api/familiar-people/2").json()

    rajesh_names = [p["name"] for p in rajesh_people]
    sunita_names = [p["name"] for p in sunita_people]

    assert "Anita Kumar" in rajesh_names
    assert "Anita Kumar" not in sunita_names
    assert "Meera Sharma" in sunita_names
    assert "Meera Sharma" not in rajesh_names

    # Reminders Isolation
    rajesh_reminders = client.get("/api/reminders/1").json()
    sunita_reminders = client.get("/api/reminders/2").json()

    rajesh_titles = [r["title"] for r in rajesh_reminders]
    sunita_titles = [r["title"] for r in sunita_reminders]

    assert any("Blood Pressure" in t for t in rajesh_titles)
    assert not any("Blood Pressure" in t for t in sunita_titles)
    assert any("Calcium" in t for t in sunita_titles)
    assert not any("Calcium" in t for t in rajesh_titles)

def test_profile_lifecycle_edit_archive_restore():
    # 1. Create a profile
    create_resp = client.post("/api/profiles", json={
        "name": "Test Senior",
        "age": 70,
        "preferred_language": "en",
        "voice_enabled": True
    })
    assert create_resp.status_code == 200
    p_id = create_resp.json()["id"]

    # 2. Edit Profile
    edit_resp = client.put(f"/api/profiles/{p_id}", json={
        "name": "Test Senior Updated",
        "age": 71,
        "preferred_language": "hi",
        "voice_enabled": False
    })
    assert edit_resp.status_code == 200
    assert edit_resp.json()["name"] == "Test Senior Updated"
    assert edit_resp.json()["age"] == 71
    assert edit_resp.json()["preferred_language"] == "hi"

    # 3. Archive Profile
    arch_resp = client.post(f"/api/profiles/{p_id}/archive")
    assert arch_resp.status_code == 200

    # Active profiles should NOT include archived profile
    active_profiles = client.get("/api/profiles").json()
    assert not any(p["id"] == p_id for p in active_profiles)

    # Archived profiles should list it
    arch_list = client.get("/api/profiles/archived").json()
    assert any(p["id"] == p_id for p in arch_list)

    # 4. Restore Profile
    restore_resp = client.post(f"/api/profiles/{p_id}/restore")
    assert restore_resp.status_code == 200

    # Active profiles should include restored profile
    active_again = client.get("/api/profiles").json()
    assert any(p["id"] == p_id for p in active_again)

def test_profile_permanent_deletion_cascade():
    # 1. Create a profile with session and reminders
    create_resp = client.post("/api/profiles", json={
        "name": "To Be Deleted",
        "age": 80,
        "preferred_language": "en",
        "voice_enabled": True
    })
    p_id = create_resp.json()["id"]

    # Add reminder
    client.post("/api/reminders", json={
        "user_id": p_id,
        "type": "medication",
        "title": "Temp Med",
        "time": "10:00 AM",
        "repeat_pattern": "Daily",
        "enabled": True
    })

    # Add familiar person
    client.post("/api/familiar-people", json={
        "user_id": p_id,
        "name": "Temp Relative",
        "relationship": "Friend",
        "photo_url": "https://example.com/test.jpg",
        "consent_confirmed": True
    })

    # 2. Permanent Deletion
    del_resp = client.delete(f"/api/profiles/{p_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "permanently_deleted"

    # Profile should be completely removed
    get_resp = client.get(f"/api/profiles/{p_id}")
    assert get_resp.status_code == 404

    # Reminders and familiar people should be wiped
    reminders = client.get(f"/api/reminders/{p_id}").json()
    assert len(reminders) == 0

    people = client.get(f"/api/familiar-people/{p_id}").json()
    assert len(people) == 0

def test_profile_export_data():
    export_resp = client.get("/api/profiles/1/export")
    assert export_resp.status_code == 200
    data = export_resp.json()
    assert data["profile"]["name"] == "Rajesh Kumar"
    assert "sessions" in data
    assert "game_sessions" in data
    assert "familiar_people" in data
    assert "reminders" in data
    assert "disclaimer" in data

def test_cross_caregiver_authorization_security():
    # Create Caregiver B
    reg_resp = client.post("/api/auth/register", json={
        "name": "Caregiver B",
        "email": "caregiver_b_unique@example.com",
        "password": "password123"
    })
    assert reg_resp.status_code == 200
    token_b = reg_resp.json()["token"]

    # Caregiver B creates Profile B
    p_resp = client.post("/api/profiles", json={
        "name": "Profile B Senior",
        "age": 73,
        "preferred_language": "en",
        "voice_enabled": True
    }, headers={"Authorization": f"Bearer {token_b}"})
    assert p_resp.status_code == 200
    profile_b_id = p_resp.json()["id"]

    # Caregiver A (Pavan) logs in
    login_a = client.post("/api/auth/login", json={
        "email": "pavan@mindmitra.com",
        "password": "mindmitra123"
    })
    token_a = login_a.json()["token"]

    # Caregiver A tries to access Profile B -> 403 Forbidden!
    unauth_get = client.get(f"/api/profiles/{profile_b_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert unauth_get.status_code == 403

    # Caregiver A tries to edit Profile B -> 403 Forbidden!
    unauth_edit = client.put(f"/api/profiles/{profile_b_id}", json={"name": "Hacked"}, headers={"Authorization": f"Bearer {token_a}"})
    assert unauth_edit.status_code == 403

    # Caregiver A tries to archive Profile B -> 403 Forbidden!
    unauth_arch = client.post(f"/api/profiles/{profile_b_id}/archive", headers={"Authorization": f"Bearer {token_a}"})
    assert unauth_arch.status_code == 403

    # Caregiver A tries to delete Profile B -> 403 Forbidden!
    unauth_del = client.delete(f"/api/profiles/{profile_b_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert unauth_del.status_code == 403
