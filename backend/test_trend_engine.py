"""
MindMitra - Comprehensive Automated Test Suite for Longitudinal Trend & Recent Change Engine
Covers all 18 validation criteria specified in Section 38.
"""

import pytest
import datetime
from services.config import (
    MIN_TREND_SESSIONS,
    STATUS_IMPROVING,
    STATUS_STABLE,
    STATUS_VARIABLE,
    STATUS_RECENT_CHANGE,
    STATUS_OBSERVATION_AVAILABLE,
    STATUS_INSUFFICIENT_HISTORY,
    MEDICAL_DISCLAIMER,
)
from services.data_quality_service import validate_session_quality, filter_eligible_sessions
from services.baseline_service import calculate_personal_baseline
from services.trend_service import analyze_domain_trend, calculate_overall_behavioral_trend
from services.explanation_service import generate_deterministic_explanation, sanitize_explanation

def create_mock_session(
    accuracy: float = 0.85,
    latency_ms: float = 2000.0,
    difficulty: int = 2,
    events: int = 10,
    errors: int = 1,
    corrections: int = 1,
    duration_ms: float = 28000.0,
    completed: bool = True
):
    now_str = datetime.datetime.now().isoformat()
    return {
        "session_id": 1,
        "user_id": 1,
        "game_type": "memory_match",
        "difficulty": difficulty,
        "started_at": now_str,
        "completed_at": now_str if completed else None,
        "accuracy": accuracy,
        "avg_response_time_ms": latency_ms,
        "total_events": events,
        "repeat_errors": errors,
        "corrections": corrections,
        "completion_time_ms": duration_ms,
    }

# 1. No history -> Insufficient History
def test_no_history():
    res = analyze_domain_trend("memory_match", [])
    assert res["status"] == STATUS_INSUFFICIENT_HISTORY
    assert "insufficient_history" in res["reason_codes"]
    assert res["sessions_used"] == 0

# 2. 2 sessions -> Insufficient History
def test_two_sessions_history():
    sessions = [create_mock_session(0.85), create_mock_session(0.86)]
    res = analyze_domain_trend("memory_match", sessions)
    assert res["status"] == STATUS_INSUFFICIENT_HISTORY
    assert res["sessions_used"] == 2

# 3. 3-4 sessions -> Observation Available
def test_three_to_four_sessions_observation_available():
    sessions = [create_mock_session(0.84), create_mock_session(0.85), create_mock_session(0.86)]
    res = analyze_domain_trend("memory_match", sessions)
    assert res["status"] == STATUS_OBSERVATION_AVAILABLE
    assert res["sessions_used"] == 3

# 4. Stable sessions -> Stable
def test_stable_sessions():
    sessions = [
        create_mock_session(0.84, 2000),
        create_mock_session(0.85, 2050),
        create_mock_session(0.83, 2000),
        create_mock_session(0.86, 1950),
        create_mock_session(0.84, 2000),
        create_mock_session(0.85, 2020),
    ]
    res = analyze_domain_trend("memory_match", sessions)
    assert res["status"] == STATUS_STABLE
    assert "performance_stable" in res["reason_codes"]

# 5. Improving sessions -> Improving
def test_improving_sessions():
    sessions = [
        create_mock_session(0.78, 2600),
        create_mock_session(0.81, 2400),
        create_mock_session(0.84, 2200),
        create_mock_session(0.88, 2000),
        create_mock_session(0.92, 1800),
        create_mock_session(0.94, 1700),
    ]
    res = analyze_domain_trend("memory_match", sessions)
    assert res["status"] == STATUS_IMPROVING
    assert "accuracy_improving" in res["reason_codes"]

# 6. Variable sessions -> Variable
def test_variable_sessions():
    sessions = [
        create_mock_session(0.90, 1800),
        create_mock_session(0.68, 2800),
        create_mock_session(0.88, 1900),
        create_mock_session(0.70, 2700),
        create_mock_session(0.89, 1850),
        create_mock_session(0.72, 2600),
    ]
    res = analyze_domain_trend("memory_match", sessions)
    assert res["status"] == STATUS_VARIABLE
    assert "performance_variable" in res["reason_codes"]

# 7. One bad session -> MUST NOT produce Recent Change
def test_single_bad_session_not_recent_change():
    sessions = [
        create_mock_session(0.84, 2000),
        create_mock_session(0.86, 2000),
        create_mock_session(0.85, 2000),
        create_mock_session(0.84, 2000),
        create_mock_session(0.85, 2000),
        create_mock_session(0.64, 3000), # Single sudden dip
    ]
    res = analyze_domain_trend("memory_match", sessions)
    assert res["status"] != STATUS_RECENT_CHANGE
    assert res["status"] in [STATUS_VARIABLE, STATUS_STABLE]
    assert "Single-session variation" in res["observation_note"]

# 8. Repeated negative deviation -> Recent Change
def test_repeated_negative_deviation_triggers_recent_change():
    sessions = [
        create_mock_session(0.84, 2000, errors=1),
        create_mock_session(0.86, 2000, errors=1),
        create_mock_session(0.85, 2050, errors=1),
        create_mock_session(0.84, 2000, errors=1),
        create_mock_session(0.76, 2600, errors=3), # Dev 1
        create_mock_session(0.72, 2800, errors=3), # Dev 2
        create_mock_session(0.70, 2900, errors=4), # Dev 3
    ]
    res = analyze_domain_trend("memory_match", sessions)
    assert res["status"] == STATUS_RECENT_CHANGE
    assert "accuracy_below_baseline" in res["reason_codes"]
    assert "repeated_deviation" in res["reason_codes"]
    assert res["supporting_sessions"] >= 2

# 9. Higher difficulty with lower accuracy -> must NOT automatically trigger Recent Change
def test_higher_difficulty_lower_accuracy_not_recent_change():
    sessions = [
        create_mock_session(0.92, 1800, difficulty=1),
        create_mock_session(0.90, 1850, difficulty=1),
        create_mock_session(0.91, 1800, difficulty=1),
        create_mock_session(0.88, 1900, difficulty=2),
        create_mock_session(0.86, 1950, difficulty=2),
        create_mock_session(0.78, 2100, difficulty=3), # Higher difficulty challenge
    ]
    res = analyze_domain_trend("memory_match", sessions)
    assert res["status"] != STATUS_RECENT_CHANGE
    assert "performance_at_higher_difficulty" in res["reason_codes"]

# 10. Difficulty unchanged + negative performance trend -> Recent Change
def test_same_difficulty_negative_trend_recent_change():
    sessions = [
        create_mock_session(0.85, 2000, difficulty=2, errors=1),
        create_mock_session(0.86, 2000, difficulty=2, errors=1),
        create_mock_session(0.84, 2050, difficulty=2, errors=1),
        create_mock_session(0.85, 2000, difficulty=2, errors=1),
        create_mock_session(0.74, 2700, difficulty=2, errors=3),
        create_mock_session(0.72, 2800, difficulty=2, errors=4),
    ]
    res = analyze_domain_trend("memory_match", sessions)
    assert res["status"] == STATUS_RECENT_CHANGE
    assert "performance_at_same_difficulty" in res["reason_codes"]

# 11. Invalid session -> excluded from baseline and trend
def test_invalid_session_excluded():
    invalid_session = create_mock_session(0.50, 100, completed=False) # Uncompleted & abnormal latency
    valid_sessions = [
        create_mock_session(0.84),
        create_mock_session(0.85),
        create_mock_session(0.86),
    ]
    eligible, excluded = filter_eligible_sessions(valid_sessions + [invalid_session])
    assert len(eligible) == 3
    assert len(excluded) == 1
    assert excluded[0]["invalid_for_trend"] is True

# 12. Missing telemetry -> excluded/flagged
def test_missing_telemetry_excluded():
    is_valid, reason = validate_session_quality({
        "accuracy": None,
        "avg_response_time_ms": 2000,
        "completed_at": "2026-08-22T00:00:00"
    })
    assert is_valid is False
    assert "Accuracy missing" in reason

# 13, 14, 15: Explanation Guardrail & Deterministic Fallback
def test_deterministic_explanation_and_guardrail():
    mock_trend = {
        "domain_label": "Short-Term Memory",
        "status": "recent_change",
        "baseline": {"accuracy": 0.84},
        "current": {"accuracy": 0.72},
        "changes": {"latency_percent_change": 0.28},
    }
    explanation = generate_deterministic_explanation(mock_trend)
    assert "Short-Term Memory" in explanation
    assert "84%" in explanation
    assert "72%" in explanation
    assert MEDICAL_DISCLAIMER in explanation
    # Test sanitization guardrail
    sanitized = sanitize_explanation("User shows signs of dementia and cognitive decline.")
    assert "dementia" not in sanitized
    assert "cognitive decline" not in sanitized
    assert MEDICAL_DISCLAIMER in sanitized

# 16. Single-domain Recent Change -> overall does NOT say "cognitive decline"
def test_single_domain_recent_change_overall_trend():
    domain_trends = [
        {"domain_label": "Short-Term Memory", "status": STATUS_RECENT_CHANGE},
        {"domain_label": "Sequential Memory", "status": STATUS_STABLE},
        {"domain_label": "Visual Recognition", "status": STATUS_STABLE},
        {"domain_label": "Pattern Recall", "status": STATUS_STABLE},
    ]
    overall = calculate_overall_behavioral_trend(domain_trends)
    assert overall["overall_status"] == STATUS_RECENT_CHANGE
    assert "One cognitive activity domain" in overall["summary"]
    assert "cognitive decline" not in overall["summary"].lower()

# 17. All domains stable -> Overall Behavioral Trend = Stable
def test_all_domains_stable_overall():
    domain_trends = [
        {"domain_label": "Short-Term Memory", "status": STATUS_STABLE},
        {"domain_label": "Sequential Memory", "status": STATUS_STABLE},
        {"domain_label": "Visual Recognition", "status": STATUS_STABLE},
        {"domain_label": "Pattern Recall", "status": STATUS_STABLE},
    ]
    overall = calculate_overall_behavioral_trend(domain_trends)
    assert overall["overall_status"] == STATUS_STABLE
    assert "Stable" in overall["headline"]

# 18. No domain history -> Overall Behavioral Trend = Insufficient History
def test_no_domain_history_overall():
    domain_trends = [
        {"domain_label": "Short-Term Memory", "status": STATUS_INSUFFICIENT_HISTORY},
        {"domain_label": "Sequential Memory", "status": STATUS_INSUFFICIENT_HISTORY},
        {"domain_label": "Visual Recognition", "status": STATUS_INSUFFICIENT_HISTORY},
        {"domain_label": "Pattern Recall", "status": STATUS_INSUFFICIENT_HISTORY},
    ]
    overall = calculate_overall_behavioral_trend(domain_trends)
    assert overall["overall_status"] == STATUS_INSUFFICIENT_HISTORY
