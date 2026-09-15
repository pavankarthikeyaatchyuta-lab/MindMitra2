"""
MindMitra - Session Eligibility & Data Quality Service
Validates sessions before participating in personal baseline and longitudinal trend analysis.
"""

from typing import Dict, Any, Tuple, List

def validate_session_quality(session: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validates if a game session satisfies data quality requirements.
    Returns (is_eligible, exclusion_reason).
    """
    # 1. Must have valid completion
    if not session.get("completed_at") and not session.get("completion_time_ms"):
        return False, "Session uncompleted or missing completion timestamp"

    # 2. Must have valid accuracy
    accuracy = session.get("accuracy")
    if accuracy is None or not (0.0 <= float(accuracy) <= 1.0):
        return False, "Accuracy missing or outside [0.0, 1.0] range"

    # 3. Must have valid response count / total events
    total_events = session.get("total_events")
    if total_events is None or int(total_events) < 2:
        return False, "Insufficient telemetry events (total_events < 2)"

    # 4. Valid response times (e.g. >= 250ms and <= 60000ms)
    avg_latency = session.get("avg_response_time_ms")
    if avg_latency is None or float(avg_latency) < 200 or float(avg_latency) > 60000:
        return False, "Average response time abnormal or out of realistic range"

    # 5. Reasonable completion duration (>= 4000ms)
    duration = session.get("completion_time_ms")
    if duration is not None and float(duration) < 4000:
        return False, "Abnormally short session duration (< 4 seconds)"

    # 6. Valid difficulty metadata
    difficulty = session.get("difficulty")
    if difficulty is None or not (1 <= int(difficulty) <= 5):
        return False, "Difficulty level missing or invalid (expected 1-5)"

    return True, ""

def filter_eligible_sessions(sessions: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Splits a list of game sessions into (eligible_sessions, excluded_sessions).
    """
    eligible = []
    excluded = []
    for s in sessions:
        is_valid, reason = validate_session_quality(s)
        s_copy = dict(s)
        s_copy["invalid_for_trend"] = not is_valid
        s_copy["exclusion_reason"] = reason
        if is_valid:
            eligible.append(s_copy)
        else:
            excluded.append(s_copy)
    return eligible, excluded
