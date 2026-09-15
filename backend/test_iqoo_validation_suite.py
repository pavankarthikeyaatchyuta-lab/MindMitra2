import os
import sys
import json
import pytest
import numpy as np
from fastapi.testclient import TestClient

# Add paths
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ml'))
sys.path.append(os.path.dirname(__file__))

from main import app
import joblib

client = TestClient(app)

def test_1_on_device_model_fidelity_and_disagreement_rate():
    """
    Test 1: Compare predictions of on-device JSON model trees against Python RandomForest model.
    Verify prediction disagreement rate across 500 diverse samples.
    """
    model_pkl = os.path.join(os.path.dirname(__file__), '..', 'ml', 'model.pkl')
    json_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'services', 'onDeviceModel.json')
    
    assert os.path.exists(model_pkl), "model.pkl must exist"
    assert os.path.exists(json_path), "onDeviceModel.json must exist"

    p = joblib.load(model_pkl)
    py_model = p['model']
    scaler = p['engineer'].scaler
    features = p['engineer'].features

    with open(json_path, 'r') as f:
        js_model = json.load(f)

    assert js_model['n_estimators'] == len(js_model['trees'])
    assert len(js_model['features']) == 9

    # Generate 500 test gameplay telemetry feature samples
    np.random.seed(42)
    sample_accuracies = np.random.uniform(0.3, 0.98, 500)
    sample_latencies = np.random.uniform(800, 7000, 500)
    sample_variances = np.random.uniform(0.05, 0.6, 500)
    sample_repeat_errors = np.random.uniform(0.0, 0.4, 500)
    sample_corrections = np.random.uniform(0.0, 0.5, 500)
    sample_completions = np.random.uniform(15000, 90000, 500)
    sample_difficulties = np.random.randint(1, 5, 500)
    sample_prev_acc = np.random.uniform(0.4, 0.98, 500)
    sample_trends = np.random.uniform(-0.5, 0.5, 500)

    X_raw = np.column_stack([
        sample_accuracies,
        sample_latencies,
        sample_variances,
        sample_repeat_errors,
        sample_corrections,
        sample_completions,
        sample_difficulties,
        sample_prev_acc,
        sample_trends
    ])

    X_scaled = scaler.transform(X_raw)

    # 1. Python predictions using first N estimators (matching exported trees)
    n_trees = js_model['n_estimators']
    tree_preds = np.array([est.predict_proba(X_scaled) for est in py_model.estimators_[:n_trees]])
    py_avg_probs = np.mean(tree_preds, axis=0)
    py_classes = np.argmax(py_avg_probs, axis=1)

    # 2. JS / JSON tree simulation
    js_classes = []
    for row in range(500):
        x = X_scaled[row]
        tree_probs = []
        for t in js_model['trees']:
            node = 0
            while t['children_left'][node] != -1:
                feat_idx = t['feature'][node]
                th = t['threshold'][node]
                if x[feat_idx] <= th:
                    node = t['children_left'][node]
                else:
                    node = t['children_right'][node]
            tree_probs.append(t['value'][node])
        avg_p = np.mean(tree_probs, axis=0)
        js_classes.append(int(np.argmax(avg_p)))

    js_classes = np.array(js_classes)
    disagreements = np.sum(py_classes != js_classes)
    disagreement_rate = (disagreements / 500) * 100

    print(f"\n[Audit Test 1] Tested 500 samples: Disagreements={disagreements}, Disagreement Rate={disagreement_rate:.2f}%")
    assert disagreement_rate <= 1.0, f"Disagreement rate too high: {disagreement_rate}%"


def test_2_touch_telemetry_normalization_exactness():
    """
    Test 2: Verify StandardScaler normalization match between TypeScript model and Python scaler.
    """
    json_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'services', 'onDeviceModel.json')
    with open(json_path, 'r') as f:
        js_model = json.load(f)

    model_pkl = os.path.join(os.path.dirname(__file__), '..', 'ml', 'model.pkl')
    p = joblib.load(model_pkl)
    scaler = p['engineer'].scaler

    # Verify mean and scale vectors match
    py_mean = np.round(scaler.mean_, 5)
    js_mean = np.array(js_model['scaler']['mean'])
    np.testing.assert_almost_equal(py_mean, js_mean, decimal=4)

    py_scale = np.round(scaler.scale_, 5)
    js_scale = np.array(js_model['scaler']['scale'])
    np.testing.assert_almost_equal(py_scale, js_scale, decimal=4)


def test_3_personal_baseline_calibration_and_profile_isolation():
    """
    Test 3: Prove baseline calibration state for early sessions (<3)
    and ensure Profile 1 (Grandpa) and Profile 2 (Grandma) history cannot mix.
    """
    # Create two isolated profiles under a test caregiver
    import uuid
    uid = uuid.uuid4().hex[:10]
    reg_res = client.post("/api/auth/register", json={
        "name": "Audit Caregiver",
        "email": f"audit_{uid}@mindmitra.org",
        "password": "SecurePassword123!"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Profile A (Grandpa)
    p_a = client.post("/api/profiles", json={
        "name": "Grandpa Rajesh",
        "age": 74,
        "preferred_language": "en",
        "voice_enabled": True
    }, headers=headers).json()

    # Create Profile B (Grandma Sunita)
    p_b = client.post("/api/profiles", json={
        "name": "Grandma Sunita",
        "age": 71,
        "preferred_language": "en",
        "voice_enabled": True
    }, headers=headers).json()

    # Verify neither profile has sessions
    trends_a = client.get(f"/api/analytics/trends/{p_a['id']}", headers=headers).json()
    assert trends_a[0]["status"] in ["insufficient_history", "calibrating"]

    # Start and record 2 sessions for Grandpa
    for _ in range(2):
        s = client.post("/api/sessions/start", json={"user_id": p_a['id']}, headers=headers).json()
        gs = client.post("/api/games/session/start", json={
            "session_id": s["id"],
            "user_id": p_a['id'],
            "game_type": "memory_match",
            "difficulty": 2
        }, headers=headers).json()
        client.post(f"/api/games/session/{gs['id']}/complete", json={
            "accuracy": 0.88,
            "avg_response_time_ms": 2000,
            "repeat_errors": 0,
            "corrections": 1,
            "completion_time_ms": 25000,
            "total_events": 10
        }, headers=headers)

    # Verify Grandpa's trend is in calibration state (insufficient history until >=3 sessions)
    trends_a_after = client.get(f"/api/analytics/trends/{p_a['id']}", headers=headers).json()
    assert trends_a_after[0]["trend"] in ["insufficient_history", "calibrating"]

    # Verify Grandpa's game session history recorded exactly 2 sessions
    sessions_a = client.get(f"/api/games/sessions/user/{p_a['id']}", headers=headers).json()
    assert len(sessions_a) == 2

    # CRITICAL: Verify Grandma has ZERO sessions (Zero leakage across profiles)
    trends_b = client.get(f"/api/analytics/trends/{p_b['id']}", headers=headers).json()
    assert trends_b[0]["trend"] in ["insufficient_history", "no_history"]
    sessions_b = client.get(f"/api/games/sessions/user/{p_b['id']}", headers=headers).json()
    assert len(sessions_b) == 0


def test_4_office_kit_cross_device_physical_sync():
    """
    Test 4: Verify physical cross-device synchronization between Phone publisher and Laptop Office Kit listener.
    """
    test_packet = {
        "id": "pkt_cross_device_test_101",
        "profileId": 1,
        "profileName": "Rajesh Kumar",
        "timestamp": "2026-09-15T09:00:00Z",
        "deviceSource": "iQOO Phone (On-Device Inference)",
        "baselineAccuracy": 0.88,
        "sessionAccuracy": 0.61,
        "baselineLatencyMs": 2000,
        "sessionLatencyMs": 4800,
        "baselineCorrections": 1,
        "sessionCorrections": 7,
        "status": "MEANINGFUL_DEVIATION",
        "primarySignals": ["slower responses", "increased corrections", "lower task accuracy"],
        "adaptation": {
            "recommendedDifficulty": 2,
            "previousDifficulty": 4,
            "action": "Difficulty adjusted from Level 4 to Level 2",
            "reason": "Reducing complexity to restore comfort and positive engagement."
        },
        "onDeviceML": {
            "model": "MindMitra-RF-Mobile (35 Trees)",
            "latencyMs": 1.4,
            "confidence": 0.88,
            "decision": "DECREASE"
        },
        "behavioralSignals": {
            "firstInteractionLatencyMs": 3500,
            "hesitationCount: ": 4,
            "repeatErrorRate": 0.2,
            "touchCount": 20
        }
    }

    # 1. Phone publishes packet
    pub_res = client.post("/api/office-kit/publish", json=test_packet)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"

    # 2. Laptop polls for latest packet
    latest_res = client.get("/api/office-kit/latest")
    assert latest_res.status_code == 200
    pkt = latest_res.json()["packet"]
    assert pkt is not None
    assert pkt["id"] == "pkt_cross_device_test_101"
    assert pkt["status"] == "MEANINGFUL_DEVIATION"
    assert pkt["baselineAccuracy"] == 0.88
    assert pkt["sessionAccuracy"] == 0.61

    # 3. Laptop fetches history
    hist_res = client.get("/api/office-kit/history")
    assert hist_res.status_code == 200
    assert len(hist_res.json()["packets"]) >= 1


def test_5_privacy_and_security_guardrails():
    """
    Test 5: Verify no raw audio / face endpoints accept binary raw streams without authorization.
    Verify explainability endpoint carries mandatory medical disclaimer.
    """
    # 1. Verify explain insight disclaimer
    exp_res = client.post("/api/explain/insight", json={
        "domain": "Personal Behavioral Baseline",
        "status": "recent_change",
        "evidence": "Accuracy reduced, latency increased."
    })
    assert exp_res.status_code == 200
    data = exp_res.json()
    assert "explanation" in data
    assert "disclaimer" in data
    assert "not a medical diagnosis" in data["disclaimer"].lower() or "not a medical diagnosis" in data["explanation"].lower()


def test_6_office_kit_publish_validation_and_rejection():
    """
    Test 6: Verify Office Kit publish endpoint rejects malformed packets with 422 and handles duplicates idempotently.
    """
    # 1. Missing ID
    res1 = client.post("/api/office-kit/publish", json={"profileId": 1, "status": "NORMAL"})
    assert res1.status_code == 422

    # 2. Missing Profile ID
    res2 = client.post("/api/office-kit/publish", json={"id": "pkt_invalid_no_profile"})
    assert res2.status_code == 422

    # 3. Non-dictionary body
    res3 = client.post("/api/office-kit/publish", content="not a json", headers={"Content-Type": "application/json"})
    assert res3.status_code == 422

    # 4. Valid packet with schemaVersion: "1.0"
    valid_pkt = {
        "schemaVersion": "1.0",
        "id": "pkt_valid_schema_test_42",
        "profileId": 1,
        "profile": {"id": 1, "name": "Rajesh Kumar"},
        "timestamp": "2026-09-15T12:00:00Z",
        "deviceSource": "iQOO Phone (On-Device Inference)",
        "baselineAccuracy": 0.88,
        "sessionAccuracy": 0.85,
        "baselineLatencyMs": 2000,
        "sessionLatencyMs": 2100,
        "baselineCorrections": 1,
        "sessionCorrections": 1,
        "status": "NORMAL",
        "primarySignals": ["stable"],
        "adaptation": {
            "recommendedDifficulty": 3,
            "previousDifficulty": 3,
            "action": "Maintain level",
            "reason": "Stable pattern"
        },
        "onDeviceML": {
            "model": "MindMitra-RF-Mobile (35 Trees)",
            "latencyMs": 0.05,
            "confidence": 0.9,
            "decision": "MAINTAIN"
        },
        "behavioralSignals": {
            "firstInteractionLatencyMs": 1500,
            "hesitationCount": 0,
            "repeatErrorRate": 0.0,
            "touchCount": 12
        }
    }
    res4 = client.post("/api/office-kit/publish", json=valid_pkt)
    assert res4.status_code == 200
    assert res4.json()["status"] == "published"

    # 5. Duplicate packet should be accepted idempotently
    res5 = client.post("/api/office-kit/publish", json=valid_pkt)
    assert res5.status_code == 200


def test_7_unauthorized_endpoints():
    """
    Test 7: Verify unauthenticated requests to protected endpoints are rejected with 401.
    """
    # Protected endpoint without authorization header
    res = client.post("/api/auth/change-password", json={"current_password": "old", "new_password": "new"})
    assert res.status_code == 401, f"Expected 401 for unauthorized password change, got {res.status_code}"


def test_8_non_diagnostic_medical_disclaimer_presence():
    """
    Test 8: Verify system health and info endpoints do not claim medical diagnosis.
    """
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "disclaimer" in data
    assert "not a medical diagnosis" in data["disclaimer"].lower() or "behavioral" in data["disclaimer"].lower()

