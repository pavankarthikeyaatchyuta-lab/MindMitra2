"""
MindMitra - Complete Data Persistence & Logout Test Suite
Tests Section 26:
1. Login caregiver.
2. Create Grandpa.
3. Create Grandma.
4. Add familiar person to Grandpa.
5. Add reminder to Grandpa.
6. Start Grandpa session.
7. Complete at least one game.
8. Logout.
9. Login again.
10. Verify Grandpa exists.
11. Verify Grandma exists.
12. Verify Grandpa familiar person exists.
13. Verify Grandpa reminder exists.
14. Verify Grandpa session exists.
15. Switch profiles and verify profile isolation.
16. Logout & Login again and verify 100% persistence.
"""

import pytest
import os
from fastapi.testclient import TestClient

os.environ["DB_FILE"] = "test_persistence.db"

from main import app, get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_clean_db():
    if os.path.exists("test_persistence.db"):
        try:
            os.remove("test_persistence.db")
        except Exception:
            pass
    with get_db() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM game_events")
        c.execute("DELETE FROM adaptive_decisions")
        c.execute("DELETE FROM game_sessions")
        c.execute("DELETE FROM sessions")
        c.execute("DELETE FROM familiar_people")
        c.execute("DELETE FROM reminders")
        c.execute("DELETE FROM elderly_profiles")
        c.execute("DELETE FROM users")
        c.execute("DELETE FROM caregivers")
        conn.commit()
    yield

def test_full_persistence_lifecycle():
    # 1. Register new caregiver
    email = "caregiver_persistence@test.com"
    pwd = "Password123!"
    reg_resp = client.post("/api/auth/register", json={"name": "Caregiver Persistence Test", "email": email, "password": pwd})
    assert reg_resp.status_code == 200, reg_resp.text
    token = reg_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Grandpa
    p1_resp = client.post("/api/profiles", json={"name": "Grandpa Ramesh", "age": 75, "preferred_language": "en", "voice_enabled": True}, headers=headers)
    assert p1_resp.status_code == 200, p1_resp.text
    grandpa_id = p1_resp.json()["id"]

    # 3. Create Grandma
    p2_resp = client.post("/api/profiles", json={"name": "Grandma Sita", "age": 72, "preferred_language": "hi", "voice_enabled": True}, headers=headers)
    assert p2_resp.status_code == 200, p2_resp.text
    grandma_id = p2_resp.json()["id"]

    # 4. Add familiar person to Grandpa
    fam_resp = client.post("/api/familiar-people", json={
        "user_id": grandpa_id,
        "name": "Son Vijay",
        "relationship": "Son",
        "photo_url": "https://example.com/photo.jpg",
        "consent_confirmed": True
    }, headers=headers)
    assert fam_resp.status_code == 200, fam_resp.text
    fam_id = fam_resp.json()["id"]

    # 5. Add reminder to Grandpa
    rem_resp = client.post("/api/reminders", json={
        "user_id": grandpa_id,
        "type": "medication",
        "title": "Heart Medicine",
        "time": "08:00 AM",
        "repeat_pattern": "daily",
        "enabled": True
    }, headers=headers)
    assert rem_resp.status_code == 200, rem_resp.text
    rem_id = rem_resp.json()["id"]

    # 6. Start Grandpa session
    sess_resp = client.post("/api/sessions/start", json={"user_id": grandpa_id}, headers=headers)
    assert sess_resp.status_code == 200, sess_resp.text
    sess_id = sess_resp.json()["id"]

    # Duplicate session check -> should reuse sess_id
    sess_resp2 = client.post("/api/sessions/start", json={"user_id": grandpa_id}, headers=headers)
    assert sess_resp2.json()["id"] == sess_id

    # 7. Complete at least one game
    gs_start = client.post("/api/games/session/start", json={
        "session_id": sess_id,
        "user_id": grandpa_id,
        "game_type": "memory_match",
        "difficulty": 2
    }, headers=headers)
    assert gs_start.status_code == 200
    gs_id = gs_start.json()["id"]

    gs_complete = client.post(f"/api/games/session/{gs_id}/complete", json={
        "accuracy": 0.85,
        "avg_response_time_ms": 1800,
        "repeat_errors": 0,
        "corrections": 1,
        "completion_time_ms": 32000,
        "total_events": 8
    }, headers=headers)
    assert gs_complete.status_code == 200

    # 8. Logout
    logout_resp = client.post("/api/auth/logout", headers=headers)
    assert logout_resp.status_code == 200

    # 9. Login again
    login_resp = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert login_resp.status_code == 200, login_resp.text
    new_token = login_resp.json()["token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}

    # 10. Verify Grandpa exists
    # 11. Verify Grandma exists
    profs_resp = client.get("/api/profiles", headers=new_headers)
    assert profs_resp.status_code == 200
    prof_names = [p["name"] for p in profs_resp.json()]
    assert "Grandpa Ramesh" in prof_names
    assert "Grandma Sita" in prof_names

    # 12. Verify Grandpa familiar person exists
    fam_list = client.get(f"/api/familiar-people/{grandpa_id}", headers=new_headers)
    assert fam_list.status_code == 200
    assert len(fam_list.json()) == 1
    assert fam_list.json()[0]["name"] == "Son Vijay"

    # 13. Verify Grandpa reminder exists
    rem_list = client.get(f"/api/reminders/{grandpa_id}", headers=new_headers)
    assert rem_list.status_code == 200
    assert len(rem_list.json()) == 1
    assert rem_list.json()[0]["title"] == "Heart Medicine"

    # 14. Verify Grandpa session exists
    sess_list = client.get(f"/api/sessions/user/{grandpa_id}", headers=new_headers)
    assert sess_list.status_code == 200
    assert len(sess_list.json()) >= 1
    assert sess_list.json()[0]["id"] == sess_id

    # 15. Verify Grandma has 0 sessions (Profile Isolation)
    grandma_sess = client.get(f"/api/sessions/user/{grandma_id}", headers=new_headers)
    assert grandma_sess.status_code == 200
    assert len(grandma_sess.json()) == 0

    # 16. Logout & login 2nd time -> 100% persistent
    client.post("/api/auth/logout", headers=new_headers)
    login2 = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert login2.status_code == 200
    token3 = login2.json()["token"]
    headers3 = {"Authorization": f"Bearer {token3}"}

    profs3 = client.get("/api/profiles", headers=headers3)
    assert len(profs3.json()) == 2
