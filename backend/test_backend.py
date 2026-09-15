import pytest
import sqlite3
import json
from fastapi.testclient import TestClient
import os
import sys

sys.path.append(os.path.dirname(__file__))
from main import app, init_db, get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_health_and_seed_users():
    resp = client.post("/api/users/demo")
    assert resp.status_code == 200
    
    users_resp = client.get("/api/users")
    assert users_resp.status_code == 200
    users = users_resp.json()
    assert len(users) >= 3

def test_session_lifecycle():
    # Start session
    start_resp = client.post("/api/sessions/start", json={"user_id": 1})
    assert start_resp.status_code == 200
    session_id = start_resp.json()["id"]
    
    # Start game session (Pattern Recall)
    game_start = client.post("/api/games/session/start", json={
        "session_id": session_id,
        "user_id": 1,
        "game_type": "pattern_recall",
        "difficulty": 1
    })
    assert game_start.status_code == 200
    game_session_id = game_start.json()["id"]
    
    # Complete game session
    game_complete = client.post(f"/api/games/session/{game_session_id}/complete", json={
        "accuracy": 0.9,
        "avg_response_time_ms": 1800.0,
        "repeat_errors": 0,
        "corrections": 1,
        "completion_time_ms": 25000.0,
        "total_events": 8
    })
    assert game_complete.status_code == 200
    
    # Complete session
    complete_resp = client.post(f"/api/sessions/{session_id}/complete")
    assert complete_resp.status_code == 200

def test_adaptive_recommendation():
    resp_high = client.post("/api/adaptive/recommend", json={
        "user_id": 1,
        "game_type": "memory_match",
        "current_metrics": {
            "accuracy": 0.95,
            "mean_response_time_ms": 1500.0,
            "response_time_variance": 0.1,
            "repeat_error_rate": 0.0,
            "correction_rate": 0.05,
            "completion_time_ms": 20000.0,
            "current_difficulty": 2
        }
    })
    assert resp_high.status_code == 200
    data_high = resp_high.json()
    assert data_high["recommendation"].lower() == "increase"
    assert data_high["recommended_difficulty"] == 3
    assert len(data_high["reason"]) > 0

def test_familiar_people_crud():
    # Create familiar person
    create_resp = client.post("/api/familiar-people", json={
        "user_id": 1,
        "name": "Anita",
        "relationship": "Daughter",
        "photo_url": "https://example.com/photo.jpg",
        "consent_confirmed": True
    })
    assert create_resp.status_code == 200
    person_id = create_resp.json()["id"]

    # Get familiar people
    get_resp = client.get("/api/familiar-people/1")
    assert get_resp.status_code == 200
    people = get_resp.json()
    assert any(p["id"] == person_id for p in people)

    # Delete
    del_resp = client.delete(f"/api/familiar-people/{person_id}")
    assert del_resp.status_code == 200

def test_baseline_and_analytics():
    demo_resp = client.post("/api/demo/seed")
    assert demo_resp.status_code == 200
    
    # Test baseline
    baseline_resp = client.get("/api/analytics/baseline/1/pattern_recall")
    assert baseline_resp.status_code == 200
    b_data = baseline_resp.json()
    assert b_data["sufficient_data"] is True

    # Test all 4 cognitive domains
    domains_resp = client.get("/api/analytics/cognitive-domains/1")
    assert domains_resp.status_code == 200
    domains = domains_resp.json()
    assert len(domains) == 4
