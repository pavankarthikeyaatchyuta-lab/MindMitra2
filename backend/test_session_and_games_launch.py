import pytest
import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_fresh_profile_zero_history_session_and_all_four_games():
    uid = uuid.uuid4().hex[:8]
    email = f"caregiver_{uid}@mindmitra.com"

    # 1. Register new caregiver
    reg_resp = client.post("/api/auth/register", json={
        "name": "Testing Caregiver",
        "email": email,
        "password": "Password123!"
    })
    assert reg_resp.status_code == 200
    token = reg_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create fresh elderly profile (Pollayya with 0 sessions)
    prof_resp = client.post("/api/profiles", json={
        "name": "Pollayya",
        "age": 74,
        "preferred_language": "te",
        "voice_enabled": True
    }, headers=headers)
    assert prof_resp.status_code == 200
    pollayya_id = prof_resp.json()["id"]

    # 3. Check Trends for Pollayya (0 sessions -> Insufficient History)
    trends_resp = client.get(f"/api/analytics/trends/{pollayya_id}", headers=headers)
    assert trends_resp.status_code == 200
    trends = trends_resp.json()
    for t in trends:
        assert t["trend"] in ["insufficient_history", "no_history"]

    # 4. Check Insights for Pollayya (Deterministic explanation without calling LLM)
    insights_resp = client.get(f"/api/explain/insights/{pollayya_id}", headers=headers)
    assert insights_resp.status_code == 200

    # 5. Start Today's Session for Pollayya (Must succeed with zero history)
    sess_resp = client.post("/api/sessions/start", json={"user_id": pollayya_id})
    assert sess_resp.status_code == 200
    session_id = sess_resp.json()["id"]
    assert session_id > 0

    # 6. Play Game 1: Memory Match (Cold-start Level 1)
    g1_resp = client.post("/api/games/session/start", json={
        "session_id": session_id,
        "user_id": pollayya_id,
        "game_type": "memory_match",
        "difficulty": 1
    })
    assert g1_resp.status_code == 200
    g1_id = g1_resp.json()["id"]

    g1_comp = client.post(f"/api/games/session/{g1_id}/complete", json={
        "accuracy": 0.85,
        "avg_response_time_ms": 2200,
        "repeat_errors": 0,
        "corrections": 1,
        "completion_time_ms": 25000,
        "total_events": 6
    })
    assert g1_comp.status_code == 200

    # 7. Play Game 2: Daily Routine (Sequential Memory)
    g2_resp = client.post("/api/games/session/start", json={
        "session_id": session_id,
        "user_id": pollayya_id,
        "game_type": "daily_routine",
        "difficulty": 1
    })
    assert g2_resp.status_code == 200
    g2_id = g2_resp.json()["id"]

    g2_comp = client.post(f"/api/games/session/{g2_id}/complete", json={
        "accuracy": 0.90,
        "avg_response_time_ms": 1800,
        "repeat_errors": 0,
        "corrections": 0,
        "completion_time_ms": 18000,
        "total_events": 4
    })
    assert g2_comp.status_code == 200

    # 8. Play Game 3: Object Recognition (Works with 0 familiar people)
    g3_resp = client.post("/api/games/session/start", json={
        "session_id": session_id,
        "user_id": pollayya_id,
        "game_type": "object_recognition",
        "difficulty": 1
    })
    assert g3_resp.status_code == 200
    g3_id = g3_resp.json()["id"]

    g3_comp = client.post(f"/api/games/session/{g3_id}/complete", json={
        "accuracy": 1.0,
        "avg_response_time_ms": 1500,
        "repeat_errors": 0,
        "corrections": 0,
        "completion_time_ms": 12000,
        "total_events": 3
    })
    assert g3_comp.status_code == 200

    # 9. Play Game 4: Pattern Recall
    g4_resp = client.post("/api/games/session/start", json={
        "session_id": session_id,
        "user_id": pollayya_id,
        "game_type": "pattern_recall",
        "difficulty": 1
    })
    assert g4_resp.status_code == 200
    g4_id = g4_resp.json()["id"]

    g4_comp = client.post(f"/api/games/session/{g4_id}/complete", json={
        "accuracy": 0.80,
        "avg_response_time_ms": 2600,
        "repeat_errors": 1,
        "corrections": 0,
        "completion_time_ms": 28000,
        "total_events": 4
    })
    assert g4_comp.status_code == 200

    # 10. Complete Today's Session
    complete_resp = client.post(f"/api/sessions/{session_id}/complete")
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "completed"

    # 11. Verify session details contain all 4 game sessions
    sess_details = client.get(f"/api/sessions/{session_id}").json()
    assert len(sess_details["game_sessions"]) == 4
    game_types = [gs["game_type"] for gs in sess_details["game_sessions"]]
    assert "memory_match" in game_types
    assert "daily_routine" in game_types
    assert "object_recognition" in game_types
    assert "pattern_recall" in game_types
