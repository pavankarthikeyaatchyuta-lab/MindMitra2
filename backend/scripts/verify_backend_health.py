import urllib.request
import json
import sys

def run_backend_verification():
    print("==================================================")
    print("      MINDMITRA BACKEND COMPREHENSIVE HEALTH CHECK")
    print("==================================================")
    base_url = "http://localhost:8000"

    # 1. Health endpoint
    try:
        req = urllib.request.Request(f"{base_url}/api/health")
        with urllib.request.urlopen(req) as resp:
            health = json.loads(resp.read().decode())
            print(f"[PASS] Health: {health.get('status')} - {health.get('service')}")
    except Exception as e:
        print(f"[FAIL] Health endpoint error: {e}")
        return False

    # 2. Authentication Login
    try:
        login_data = json.dumps({"email": "pavan@mindmitra.com", "password": "mindmitra123"}).encode()
        req = urllib.request.Request(
            f"{base_url}/api/auth/login",
            data=login_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            auth_res = json.loads(resp.read().decode())
            token = auth_res.get("token")
            caregiver = auth_res.get("caregiver")
            print(f"[PASS] Auth Login: Caregiver '{caregiver.get('name')}' ({caregiver.get('email')}), Token acquired.")
    except Exception as e:
        print(f"[FAIL] Auth Login error: {e}")
        return False

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 3. Caregiver Profiles
    try:
        req = urllib.request.Request(f"{base_url}/api/caregiver/profiles", headers=headers)
        with urllib.request.urlopen(req) as resp:
            profiles = json.loads(resp.read().decode())
            print(f"[PASS] Profiles: {len(profiles)} profiles attached to caregiver.")
            for p in profiles:
                print(f"       - Profile {p.get('id')}: {p.get('name')} (Age {p.get('age')})")
    except Exception as e:
        print(f"[FAIL] Profiles error: {e}")
        return False

    # 4. Baseline Calculation
    try:
        req = urllib.request.Request(f"{base_url}/api/baseline/1", headers=headers)
        with urllib.request.urlopen(req) as resp:
            baseline = json.loads(resp.read().decode())
            calibrated = baseline.get("calibrated")
            total_sessions = baseline.get("total_eligible_sessions")
            print(f"[PASS] Baseline (Profile 1): Calibrated={calibrated}, Total eligible sessions={total_sessions}")
    except Exception as e:
        print(f"[FAIL] Baseline error: {e}")
        return False

    # 5. Trend Analysis
    try:
        req = urllib.request.Request(f"{base_url}/api/trend/1", headers=headers)
        with urllib.request.urlopen(req) as resp:
            trend = json.loads(resp.read().decode())
            overall_trend = trend.get("overall_trend")
            sufficient = trend.get("sufficient_data")
            print(f"[PASS] Trend Analysis (Profile 1): Overall={overall_trend}, Sufficient data={sufficient}")
    except Exception as e:
        print(f"[FAIL] Trend error: {e}")
        return False

    # 6. Adaptive Recommendation
    try:
        req = urllib.request.Request(f"{base_url}/api/recommendation/1", headers=headers)
        with urllib.request.urlopen(req) as resp:
            rec = json.loads(resp.read().decode())
            activity = rec.get("recommended_activity")
            diff = rec.get("recommended_difficulty")
            print(f"[PASS] Adaptive Recommendation (Profile 1): Activity='{activity}', Difficulty={diff}")
    except Exception as e:
        print(f"[FAIL] Recommendation error: {e}")
        return False

    # 7. Caregiver Dashboard
    try:
        req = urllib.request.Request(f"{base_url}/api/caregiver/dashboard", headers=headers)
        with urllib.request.urlopen(req) as resp:
            dash = json.loads(resp.read().decode())
            print(f"[PASS] Caregiver Dashboard: {len(dash.get('profiles', []))} profiles summarized.")
    except Exception as e:
        print(f"[FAIL] Caregiver Dashboard error: {e}")
        return False

    # 8. Activity Session Lifecycle (Start -> Telemetry Events -> Complete)
    try:
        # Start session
        start_payload = json.dumps({
            "user_id": 1,
            "activity_type": "memory",
            "difficulty": 1
        }).encode()
        req = urllib.request.Request(
            f"{base_url}/api/session/start",
            data=start_payload,
            headers=headers
        )
        with urllib.request.urlopen(req) as resp:
            session_start = json.loads(resp.read().decode())
            session_id = session_start.get("session_id")
            print(f"[PASS] Session Lifecycle: Session started with ID {session_id}")

        # Complete session
        complete_payload = json.dumps({
            "session_id": session_id,
            "user_id": 1,
            "activity_type": "memory",
            "completion_time_ms": 28500,
            "accuracy": 0.95,
            "moves_count": 8,
            "reaction_times_ms": [1200, 1100, 1400, 950],
            "hesitation_ratio": 0.12,
            "abandoned": False,
            "interrupted": False
        }).encode()
        req = urllib.request.Request(
            f"{base_url}/api/session/complete",
            data=complete_payload,
            headers=headers
        )
        with urllib.request.urlopen(req) as resp:
            complete_res = json.loads(resp.read().decode())
            print(f"[PASS] Session Lifecycle: Session completed successfully, eligible={complete_res.get('eligible_for_baseline')}")
    except Exception as e:
        print(f"[FAIL] Session lifecycle error: {e}")
        return False

    print("==================================================")
    print("  ALL BACKEND INTEGRITY CHECKS PASSED (100%)")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_backend_verification()
    sys.exit(0 if success else 1)
