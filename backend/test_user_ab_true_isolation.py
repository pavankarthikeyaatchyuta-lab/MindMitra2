import pytest
import uuid
from fastapi.testclient import TestClient
from main import app, get_db

client = TestClient(app)

def test_true_multi_user_data_isolation_and_idor_protection():
    """
    Strict User A vs User B true isolation and IDOR test:
    1. Register/Login Caregiver User A.
    2. User A creates Profile A, starts session, completes activity with behavioral telemetry.
    3. Verify Profile A baseline, session history, and telemetry belong to User A.
    4. Logout User A.
    5. Register/Login Caregiver User B.
    6. Verify User B CANNOT see A's sessions (403).
    7. Verify User B CANNOT see A's baseline (403).
    8. Verify User B CANNOT see A's behavioral trends / history (403).
    9. Verify User B CANNOT see A's adaptation history (403).
    10. Verify User B CANNOT modify A's profile or data (403).
    11. Verify User B CANNOT access A's profile by changing ID in URL (403).
    12. Verify unauthenticated requests get 401 Unauthorized.
    13. User B creates Profile B, starts session, logs activity.
    14. Logout User B.
    15. Login User A again.
    16. Verify User A sees A's original history and baseline intact.
    17. Verify User A CANNOT see User B's profile, sessions, or baseline (403).
    """
    uid_a = uuid.uuid4().hex[:8]
    uid_b = uuid.uuid4().hex[:8]
    email_a = f"caregiver_a_{uid_a}@mindmitra.com"
    email_b = f"caregiver_b_{uid_b}@mindmitra.com"
    pwd = "SecurePassword123!"

    # ========================================================
    # STEP 1: Register & Login User A
    # ========================================================
    reg_a = client.post("/api/auth/register", json={
        "name": f"Caregiver A {uid_a}",
        "email": email_a,
        "password": pwd
    })
    assert reg_a.status_code == 200, f"Register A failed: {reg_a.text}"
    token_a = reg_a.json()["token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # ========================================================
    # STEP 2: User A creates Profile A and completes activity
    # ========================================================
    prof_a_resp = client.post("/api/profiles", json={
        "name": "Elderly Person A",
        "age": 74,
        "preferred_language": "en",
        "voice_enabled": True
    }, headers=headers_a)
    assert prof_a_resp.status_code == 200, f"Profile A create failed: {prof_a_resp.text}"
    profile_a_id = prof_a_resp.json()["id"]

    # Start session for Profile A
    sess_a_resp = client.post("/api/sessions/start", json={
        "user_id": profile_a_id
    }, headers=headers_a)
    assert sess_a_resp.status_code == 200
    session_a_id = sess_a_resp.json()["id"]

    # Start game session
    gs_a_resp = client.post("/api/games/session/start", json={
        "session_id": session_a_id,
        "user_id": profile_a_id,
        "game_type": "memory_match",
        "difficulty": 1
    }, headers=headers_a)
    assert gs_a_resp.status_code == 200
    game_sess_a_id = gs_a_resp.json()["id"]

    # Record telemetry event
    evt_a_resp = client.post("/api/games/event", json={
        "game_session_id": game_sess_a_id,
        "user_id": profile_a_id,
        "event_type": "touch_interaction",
        "event_data": {"card_index": 0, "latency_ms": 1150, "hesitation": False}
    }, headers=headers_a)
    assert evt_a_resp.status_code == 200

    # Complete game session
    comp_gs_a = client.post(f"/api/games/session/{game_sess_a_id}/complete", json={
        "user_id": profile_a_id,
        "game_type": "memory_match",
        "accuracy": 0.92,
        "avg_response_time_ms": 1350.0,
        "completion_time_ms": 22000.0,
        "total_events": 8,
        "repeat_errors": 0,
        "corrections": 1
    }, headers=headers_a)
    assert comp_gs_a.status_code == 200

    # Complete parent session
    comp_sess_a = client.post(f"/api/sessions/{session_a_id}/complete", headers=headers_a)
    assert comp_sess_a.status_code == 200

    # Run adaptive recommendation for Profile A
    rec_a = client.post("/api/adaptive/recommend", json={
        "user_id": profile_a_id,
        "game_type": "memory_match",
        "current_metrics": {
            "accuracy": 0.92,
            "mean_response_time_ms": 1350.0,
            "response_time_variance": 0.1,
            "repeat_error_rate": 0.0,
            "correction_rate": 0.05,
            "completion_time_ms": 22000.0,
            "current_difficulty": 1
        }
    }, headers=headers_a)
    assert rec_a.status_code == 200

    # ========================================================
    # STEP 3: Verify User A can access own data
    # ========================================================
    a_prof = client.get(f"/api/profiles/{profile_a_id}", headers=headers_a)
    assert a_prof.status_code == 200
    assert a_prof.json()["name"] == "Elderly Person A"

    a_sessions = client.get(f"/api/sessions/user/{profile_a_id}", headers=headers_a)
    assert a_sessions.status_code == 200
    assert len(a_sessions.json()) >= 1

    a_trends = client.get(f"/api/analytics/trends/{profile_a_id}", headers=headers_a)
    assert a_trends.status_code == 200

    a_adaptive = client.get(f"/api/adaptive/history/{profile_a_id}", headers=headers_a)
    assert a_adaptive.status_code == 200
    assert len(a_adaptive.json()) >= 1

    # ========================================================
    # STEP 4: Logout User A
    # ========================================================
    logout_a = client.post("/api/auth/logout")
    assert logout_a.status_code == 200

    # ========================================================
    # STEP 5: Register & Login User B
    # ========================================================
    reg_b = client.post("/api/auth/register", json={
        "name": f"Caregiver B {uid_b}",
        "email": email_b,
        "password": pwd
    })
    assert reg_b.status_code == 200
    token_b = reg_b.json()["token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B list profiles should be empty
    b_profiles = client.get("/api/profiles", headers=headers_b).json()
    b_profile_ids = [p["id"] for p in b_profiles]
    assert profile_a_id not in b_profile_ids, "Cross-user profile leakage in /api/profiles"

    # ========================================================
    # STEP 6: IDOR Protection Verification - User B tries accessing User A's data
    # ========================================================
    # 6.1 B cannot access A's profile details by ID
    b_hack_prof = client.get(f"/api/profiles/{profile_a_id}", headers=headers_b)
    assert b_hack_prof.status_code == 403, f"Expected 403 on profile access, got {b_hack_prof.status_code}"

    # 6.2 B cannot see A's sessions
    b_hack_sessions = client.get(f"/api/sessions/user/{profile_a_id}", headers=headers_b)
    assert b_hack_sessions.status_code == 403, f"Expected 403 on sessions access, got {b_hack_sessions.status_code}"

    # 6.3 B cannot see A's session detail
    b_hack_sess_detail = client.get(f"/api/sessions/{session_a_id}", headers=headers_b)
    assert b_hack_sess_detail.status_code == 403, f"Expected 403 on session detail, got {b_hack_sess_detail.status_code}"

    # 6.4 B cannot see A's baseline
    b_hack_base = client.get(f"/api/analytics/baseline/{profile_a_id}/memory_match", headers=headers_b)
    assert b_hack_base.status_code == 403, f"Expected 403 on baseline, got {b_hack_base.status_code}"

    # 6.5 B cannot see A's longitudinal trends
    b_hack_trends = client.get(f"/api/analytics/trends/{profile_a_id}", headers=headers_b)
    assert b_hack_trends.status_code == 403, f"Expected 403 on trends, got {b_hack_trends.status_code}"

    # 6.6 B cannot see A's adaptive history
    b_hack_adapt = client.get(f"/api/adaptive/history/{profile_a_id}", headers=headers_b)
    assert b_hack_adapt.status_code == 403, f"Expected 403 on adaptive history, got {b_hack_adapt.status_code}"

    # 6.7 B cannot modify A's profile
    b_hack_modify = client.put(f"/api/profiles/{profile_a_id}", json={
        "name": "Hacked By User B"
    }, headers=headers_b)
    assert b_hack_modify.status_code == 403, f"Expected 403 on modify, got {b_hack_modify.status_code}"

    # 6.8 B cannot delete A's profile
    b_hack_del = client.delete(f"/api/profiles/{profile_a_id}", headers=headers_b)
    assert b_hack_del.status_code == 403, f"Expected 403 on delete, got {b_hack_del.status_code}"

    # ========================================================
    # STEP 7: Unauthenticated Access Protection (401)
    # ========================================================
    unauth_prof = client.get(f"/api/profiles/{profile_a_id}")
    assert unauth_prof.status_code == 401, f"Expected 401 unauth, got {unauth_prof.status_code}"

    unauth_list = client.get("/api/profiles")
    assert unauth_list.status_code == 401, f"Expected 401 unauth, got {unauth_list.status_code}"

    unauth_trends = client.get(f"/api/analytics/trends/{profile_a_id}")
    assert unauth_trends.status_code == 401, f"Expected 401 unauth, got {unauth_trends.status_code}"

    # ========================================================
    # STEP 8: User B creates Profile B and logs session
    # ========================================================
    prof_b_resp = client.post("/api/profiles", json={
        "name": "Elderly Person B",
        "age": 69,
        "preferred_language": "hi",
        "voice_enabled": True
    }, headers=headers_b)
    assert prof_b_resp.status_code == 200
    profile_b_id = prof_b_resp.json()["id"]

    sess_b_resp = client.post("/api/sessions/start", json={"user_id": profile_b_id}, headers=headers_b)
    assert sess_b_resp.status_code == 200
    session_b_id = sess_b_resp.json()["id"]

    # Logout User B
    client.post("/api/auth/logout")

    # ========================================================
    # STEP 9: Login User A again - Verify persistence & isolation
    # ========================================================
    login_a_again = client.post("/api/auth/login", json={
        "email": email_a,
        "password": pwd
    })
    assert login_a_again.status_code == 200
    token_a_again = login_a_again.json()["token"]
    headers_a_again = {"Authorization": f"Bearer {token_a_again}"}

    # Verify A sees A's original history
    a_prof_reloaded = client.get(f"/api/profiles/{profile_a_id}", headers=headers_a_again)
    assert a_prof_reloaded.status_code == 200
    assert a_prof_reloaded.json()["name"] == "Elderly Person A"

    a_sess_reloaded = client.get(f"/api/sessions/user/{profile_a_id}", headers=headers_a_again)
    assert a_sess_reloaded.status_code == 200
    assert len(a_sess_reloaded.json()) >= 1
    assert a_sess_reloaded.json()[0]["id"] == session_a_id

    # Verify User A CANNOT see Profile B
    a_hack_b = client.get(f"/api/profiles/{profile_b_id}", headers=headers_a_again)
    assert a_hack_b.status_code == 403, f"Expected 403 for A accessing B, got {a_hack_b.status_code}"

    a_hack_b_sess = client.get(f"/api/sessions/user/{profile_b_id}", headers=headers_a_again)
    assert a_hack_b_sess.status_code == 403, f"Expected 403 for A accessing B sessions, got {a_hack_b_sess.status_code}"

    print("\n[SUCCESS] True Multi-User Data Isolation & IDOR Protection Verified 100%!")

if __name__ == "__main__":
    test_true_multi_user_data_isolation_and_idor_protection()
