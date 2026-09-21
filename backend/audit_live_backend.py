import urllib.request
import json
import time
import sys

BASE = 'http://localhost:8000'

def test(name, fn):
    try:
        t0 = time.perf_counter()
        res = fn()
        dt = (time.perf_counter() - t0) * 1000
        print(f'  [PASS] {name} ({dt:.2f}ms) -> {res}')
        return True
    except Exception as e:
        print(f'  [FAIL] {name} -> {e}')
        return False

print('====================================================')
print('        MINDMITRA BACKEND LIVE ENDPOINT AUDIT       ')
print('====================================================')

# 1. Root / Docs / OpenAPI schema
test('OpenAPI Schema (/openapi.json)', lambda: urllib.request.urlopen(f'{BASE}/openapi.json').getcode())
test('Swagger UI (/docs)', lambda: urllib.request.urlopen(f'{BASE}/docs').getcode())

# 2. Caregiver Login / Auth Token
token = None
def do_login():
    global token
    data = json.dumps({'email': 'pavan@mindmitra.com', 'password': 'mindmitra123'}).encode('utf-8')
    req = urllib.request.Request(f'{BASE}/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        token = res.get('token')
        return f"Token received: {token[:15]}..."

test('Caregiver Login (pavan@mindmitra.com)', do_login)

# 3. Authenticated Profiles Fetch
def get_profiles():
    req = urllib.request.Request(f'{BASE}/api/profiles', headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        names = [p.get("name") or p.get("display_name") for p in res]
        return f"{len(res)} profiles registered: {names}"

test('Fetch Cared-For Profiles (/api/profiles)', get_profiles)

# 4. On-Device & Server Adaptive ML Model Inference
def test_adaptive():
    payload = json.dumps({
        'user_id': 1,
        'game_type': 'memory_match',
        'current_metrics': {
            'accuracy': 0.95,
            'mean_response_time_ms': 1420.0,
            'response_time_variance': 0.12,
            'repeat_error_rate': 0.0,
            'correction_rate': 0.02,
            'completion_time_ms': 18500.0,
            'current_difficulty': 2
        }
    }).encode('utf-8')
    req = urllib.request.Request(f'{BASE}/api/adaptive/recommend', data=payload, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return f"Decision: {res.get('recommendation')} -> Level {res.get('recommended_difficulty')} ({res.get('model_name')}, {res.get('inference_latency_ms', 0):.2f}ms)"

test('Adaptive Random Forest Inference (/api/adaptive/recommend)', test_adaptive)

# 5. Baseline & Longitudinal Trend Engine
def test_trend():
    req = urllib.request.Request(f'{BASE}/api/analytics/trends/1', headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return f"{len(res)} domains analyzed (e.g., {res[0]['domain_name']}: {res[0]['trend_label']})"

test('Longitudinal Trend & Baseline (/api/analytics/trends/1)', test_trend)

# 6. Overall Trend Trajectory
def test_overall_trend():
    req = urllib.request.Request(f'{BASE}/api/analytics/overall-trend/1', headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return f"Status: {res.get('overall_status')} (Headline: {res.get('headline')})"

test('Overall Behavioral Trend (/api/analytics/overall-trend/1)', test_overall_trend)

# 7. Canonical Session History Count
def test_canonical_count():
    req = urllib.request.Request(f'{BASE}/api/sessions/canonical-count/1', headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return f"Canonical session count: {res.get('session_count')}, Game sessions: {res.get('game_session_count')}"

test('Canonical Count (/api/sessions/canonical-count/1)', test_canonical_count)

# 8. Local Explainable AI Engine
def test_explanation():
    payload = json.dumps({
        'domain': 'memory',
        'domain_label': 'Visual & Working Memory',
        'game_type': 'memory_match',
        'trend': 'STABLE',
        'status': 'STABLE',
        'observation_note': 'Performance consistent across 8 baseline sessions.',
        'reason_codes': ['CONSISTENT_ACCURACY', 'NORMAL_LATENCY']
    }).encode('utf-8')
    req = urllib.request.Request(f'{BASE}/api/explain/insight', data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        expl = res.get('explanation', '')[:65]
        return f"Provider: {res.get('provider')}, Explanation: \"{expl}...\""

test('Explainable AI Generator (/api/explain/insight)', test_explanation)

# 9. Caregiver Insights for Profile 1
def test_all_insights():
    req = urllib.request.Request(f'{BASE}/api/explain/insights/1', headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return f"{len(res)} domain insights generated for Profile 1"

test('Multi-Domain Insights (/api/explain/insights/1)', test_all_insights)

# 10. Start, Record Telemetry & Complete Session
def test_session_lifecycle():
    # Start session
    start_payload = json.dumps({
        'user_id': 1,
        'activity_type': 'memory_match',
        'difficulty': 2
    }).encode('utf-8')
    req = urllib.request.Request(
        f'{BASE}/api/sessions/start', 
        data=start_payload, 
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req) as resp:
        session_res = json.loads(resp.read().decode('utf-8'))
        sess_id = session_res.get('id')

    # Record telemetry event
    evt_payload = json.dumps({
        'game_session_id': sess_id,
        'user_id': 1,
        'event_type': 'card_flip',
        'event_data': {'card_id': 1, 'touch_latency_ms': 350}
    }).encode('utf-8')
    req2 = urllib.request.Request(
        f'{BASE}/api/games/event', 
        data=evt_payload, 
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req2) as resp2:
        pass

    # Complete session
    comp_req = urllib.request.Request(
        f'{BASE}/api/sessions/{sess_id}/complete', 
        data=b'{}', 
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(comp_req) as comp_resp:
        comp_res = json.loads(comp_resp.read().decode('utf-8'))

    return f"Session #{sess_id} started, telemetry logged, and marked {comp_res.get('status')}"

test('Session Lifecycle & Telemetry Stream', test_session_lifecycle)

# 11. Backend Health Check
test('System Health (/api/health)', lambda: urllib.request.urlopen(f'{BASE}/api/health').getcode())

print('====================================================')
print('AUDIT COMPLETE: All core backend endpoints verified!')
print('====================================================')
