"""
MindMitra - Longitudinal Trend & Recent Change Engine
Implements multi-signal consistent deviation detection, personal baseline comparison,
difficulty context analysis, and structured machine-readable reason code generation.
"""

from typing import List, Dict, Any, Optional

from .config import (
    MIN_TREND_SESSIONS,
    MIN_OBSERVATION_SESSIONS,
    DOMAIN_MAPPING,
    DOMAIN_LABELS,
    DOMAIN_ICONS,
    STATUS_IMPROVING,
    STATUS_STABLE,
    STATUS_VARIABLE,
    STATUS_RECENT_CHANGE,
    STATUS_OBSERVATION_AVAILABLE,
    STATUS_INSUFFICIENT_HISTORY,
    ACCURACY_DEVIATION_THRESHOLD,
    LATENCY_DEVIATION_THRESHOLD,
    REPEAT_ERROR_DEVIATION_THRESHOLD,
    CORRECTION_DEVIATION_THRESHOLD,
    COMPLETION_TIME_DEVIATION_THRESHOLD,
    MIN_DEVIATING_SESSIONS,
    MEDICAL_DISCLAIMER,
    normalize_game_type,
)
from .data_quality_service import filter_eligible_sessions
from .baseline_service import calculate_personal_baseline

def analyze_domain_trend(
    game_type: str,
    raw_sessions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluates longitudinal behavioral trend for a single cognitive domain.
    Enforces minimum history, data quality filters, difficulty adjustment context,
    and multi-signal repeated evidence rules.
    """
    canonical_type = normalize_game_type(game_type)
    domain_key = DOMAIN_MAPPING.get(canonical_type, canonical_type)
    domain_label = DOMAIN_LABELS.get(domain_key, canonical_type)
    domain_icon = DOMAIN_ICONS.get(domain_key, "📊")

    # 1. Filter sessions for this specific game type using canonical mapping and validate quality
    matching_sessions = [s for s in raw_sessions if normalize_game_type(s.get("game_type")) == canonical_type]
    eligible_sessions, excluded_sessions = filter_eligible_sessions(matching_sessions)

    total_eligible = len(eligible_sessions)

    # State: Insufficient History (0-2 sessions)
    if total_eligible < MIN_OBSERVATION_SESSIONS:
        note = f"Establishing personal baseline ({total_eligible} eligible session{'s' if total_eligible != 1 else ''} recorded)." if total_eligible > 0 else "No eligible gameplay sessions recorded for this domain."
        return {
            "game_type": canonical_type,
            "domain": domain_key,
            "domain_label": domain_label,
            "domain_icon": domain_icon,
            "status": STATUS_INSUFFICIENT_HISTORY,
            "trend_label": "Insufficient History",
            "sessions_used": total_eligible,
            "sessions_analyzed": total_eligible,
            "total_recorded": len(matching_sessions),
            "excluded_sessions_count": len(excluded_sessions),
            "baseline": None,
            "current": eligible_sessions[-1] if eligible_sessions else None,
            "changes": None,
            "difficulty_context": None,
            "supporting_sessions": 0,
            "reason_codes": ["insufficient_history"],
            "reasons": ["insufficient_history"],
            "observation_note": note,
            "trend_description": note,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

    # State: Observation Available (3-4 sessions) - Not enough for definitive trend, but baseline forming
    if total_eligible < MIN_TREND_SESSIONS:
        prior_sessions = eligible_sessions[:-1]
        baseline = calculate_personal_baseline(prior_sessions) or calculate_personal_baseline(eligible_sessions)
        current = eligible_sessions[-1]
        current_acc = float(current.get("accuracy", 0))
        base_med = baseline["baseline_median"] if baseline else current_acc
        note = f"Initial baseline formed ({total_eligible} eligible session{'s' if total_eligible != 1 else ''}). Additional sessions will unlock full longitudinal trend analytics."

        return {
            "game_type": canonical_type,
            "domain": domain_key,
            "domain_label": domain_label,
            "domain_icon": domain_icon,
            "status": STATUS_OBSERVATION_AVAILABLE,
            "trend_label": "Calibrating",
            "sessions_used": total_eligible,
            "sessions_analyzed": total_eligible,
            "total_recorded": len(matching_sessions),
            "excluded_sessions_count": len(excluded_sessions),
            "baseline": {
                "accuracy": baseline["baseline_median"] if baseline else current_acc,
                "latency_ms": baseline["baseline_latency"] if baseline else current.get("avg_response_time_ms", 0),
                "repeat_error_rate": baseline["baseline_repeat_error_rate"] if baseline else 0.0,
                "correction_rate": baseline["baseline_correction_rate"] if baseline else 0.0,
            },
            "current": {
                "accuracy": round(current_acc, 4),
                "latency_ms": round(float(current.get("avg_response_time_ms", 0)), 1),
                "repeat_error_rate": round(float(current.get("repeat_errors", 0)) / max(float(current.get("total_events", 1)), 1.0), 4),
                "correction_rate": round(float(current.get("corrections", 0)) / max(float(current.get("total_events", 1)), 1.0), 4),
                "difficulty": int(current.get("difficulty", 1)),
            },
            "changes": {
                "accuracy_delta": round(current_acc - base_med, 4),
                "latency_percent_change": 0.0,
                "repeat_error_delta": 0.0,
            },
            "difficulty_context": {
                "previous_difficulty": int(prior_sessions[-1].get("difficulty", 1)) if prior_sessions else 1,
                "current_difficulty": int(current.get("difficulty", 1)),
                "difficulty_changed": False,
            },
            "supporting_sessions": 0,
            "reason_codes": ["observation_available", "performance_stable"],
            "reasons": ["observation_available", "performance_stable"],
            "observation_note": note,
            "trend_description": note,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

    # Full Longitudinal Analysis (5+ eligible sessions)
    # The current session is evaluated strictly against PRIOR eligible sessions
    prior_sessions = eligible_sessions[:-1]
    baseline = calculate_personal_baseline(prior_sessions)
    if not baseline:
        baseline = calculate_personal_baseline(eligible_sessions)

    current = eligible_sessions[-1]
    current_acc = float(current.get("accuracy", 0))
    current_latency = float(current.get("avg_response_time_ms", 2000))
    current_total_events = max(float(current.get("total_events", 1)), 1.0)
    current_errors = float(current.get("repeat_errors", 0))
    current_error_rate = current_errors / current_total_events
    current_corrections = float(current.get("corrections", 0))
    current_corr_rate = current_corrections / current_total_events
    current_time = float(current.get("completion_time_ms", 30000))
    current_diff = int(current.get("difficulty", 1))

    prev_session = prior_sessions[-1]
    prev_diff = int(prev_session.get("difficulty", current_diff))
    diff_changed = (current_diff != prev_diff)

    base_med_acc = baseline["baseline_median"]
    base_latency = baseline["baseline_latency"]
    base_error_rate = baseline["baseline_repeat_error_rate"]
    base_corr_rate = baseline["baseline_correction_rate"]
    base_completion_time = baseline["baseline_completion_time"]

    # Calculate precise deltas
    acc_delta = round(current_acc - base_med_acc, 4)
    latency_pct_change = round((current_latency - base_latency) / max(base_latency, 1.0), 4)
    error_delta = round(current_error_rate - base_error_rate, 4)
    corr_delta = round(current_corr_rate - base_corr_rate, 4)
    time_pct_change = round((current_time - base_completion_time) / max(base_completion_time, 1.0), 4) if base_completion_time > 0 else 0.0

    # Count how many of recent 3 sessions had meaningful negative accuracy deviation
    recent_3_sessions = eligible_sessions[-3:]
    deviating_sessions_count = 0
    for s in recent_3_sessions:
        s_acc = float(s.get("accuracy", 0))
        if s_acc <= (base_med_acc - ACCURACY_DEVIATION_THRESHOLD):
            deviating_sessions_count += 1

    # Check supporting behavioral signals
    has_latency_increase = (latency_pct_change >= LATENCY_DEVIATION_THRESHOLD)
    has_error_increase = (error_delta >= REPEAT_ERROR_DEVIATION_THRESHOLD)
    has_corr_increase = (corr_delta >= CORRECTION_DEVIATION_THRESHOLD)
    has_time_increase = (time_pct_change >= COMPLETION_TIME_DEVIATION_THRESHOLD)
    has_supporting_signal = (has_latency_increase or has_error_increase or has_corr_increase or has_time_increase)

    reason_codes = []

    # Difficulty context tracking
    if diff_changed:
        reason_codes.append("difficulty_changed")
        if current_diff > prev_diff:
            reason_codes.append("performance_at_higher_difficulty")
        else:
            reason_codes.append("performance_at_lower_difficulty")
    else:
        reason_codes.append("performance_at_same_difficulty")

    # Evaluate Trend Status
    final_status = STATUS_STABLE
    observation_note = "Performance is consistent with the established personal baseline."

    # RULE 1: Difficulty Increased - Drop in accuracy at higher difficulty is NOT a cognitive decline!
    if current_diff > prev_diff and acc_delta < 0 and not (has_error_increase and has_latency_increase):
        final_status = STATUS_STABLE
        reason_codes.append("performance_at_higher_difficulty")
        observation_note = f"Score reflects increased task complexity at Level {current_diff}. Behavioral signals remain steady."

    # RULE 2: Baseline itself is highly variable (oscillation across history)
    elif baseline.get("baseline_std", 0.0) >= 0.08:
        final_status = STATUS_VARIABLE
        reason_codes.append("performance_variable")
        observation_note = "Performance shows day-to-day fluctuation across sessions around the moving baseline."

    # RULE 3: Consistent Multi-Session Recent Change against established baseline
    # (Condition A: 5+ sessions; Condition B: >=2 of last 3 deviated; Condition C: latest deviated; Condition D: supporting signal)
    elif (deviating_sessions_count >= MIN_DEVIATING_SESSIONS and 
          acc_delta <= -ACCURACY_DEVIATION_THRESHOLD and 
          has_supporting_signal):
        final_status = STATUS_RECENT_CHANGE
        reason_codes.append("accuracy_below_baseline")
        reason_codes.append("repeated_deviation")
        if has_latency_increase:
            reason_codes.append("latency_above_baseline")
        if has_error_increase:
            reason_codes.append("repeat_errors_increasing")
        if has_corr_increase:
            reason_codes.append("corrections_increasing")
        if has_time_increase:
            reason_codes.append("completion_time_increasing")
        
        observation_note = "Recent performance differs from the user's established baseline across consecutive sessions."

    # RULE 4: Single Bad Session - MUST NOT trigger Recent Change
    elif deviating_sessions_count == 1 and acc_delta <= -ACCURACY_DEVIATION_THRESHOLD:
        final_status = STATUS_VARIABLE
        reason_codes.append("accuracy_below_baseline")
        reason_codes.append("performance_variable")
        observation_note = "Single-session variation observed. Baseline remains established; monitoring future sessions."

    # RULE 5: Improving Trend
    elif acc_delta >= 0.06 and (latency_pct_change <= 0.05 or has_latency_increase is False):
        final_status = STATUS_IMPROVING
        reason_codes.append("accuracy_improving")
        if latency_pct_change <= -0.10:
            reason_codes.append("latency_stable")
        observation_note = "Performance shows steady improvement and faster recall compared to baseline."

    # RULE 6: Variable Performance
    elif abs(acc_delta) > 0.08:
        final_status = STATUS_VARIABLE
        reason_codes.append("performance_variable")
        observation_note = "Performance shows moderate day-to-day variance within acceptable range."

    # RULE 7: Stable Performance
    else:
        final_status = STATUS_STABLE
        reason_codes.append("performance_stable")
        observation_note = "Performance is stable and aligned with the user's personal baseline."

    status_labels = {
        STATUS_STABLE: "Stable",
        STATUS_IMPROVING: "Improving",
        STATUS_RECENT_CHANGE: "Recent Change",
        STATUS_VARIABLE: "Variable",
        STATUS_OBSERVATION_AVAILABLE: "Calibrating",
        STATUS_INSUFFICIENT_HISTORY: "Insufficient History",
    }

    return {
        "game_type": canonical_type,
        "domain": domain_key,
        "domain_label": domain_label,
        "domain_icon": domain_icon,
        "status": final_status,
        "trend_label": status_labels.get(final_status, final_status.replace("_", " ").title()),
        "sessions_used": total_eligible,
        "sessions_analyzed": total_eligible,
        "total_recorded": len(matching_sessions),
        "excluded_sessions_count": len(excluded_sessions),
        "baseline": {
            "accuracy": baseline["baseline_median"],
            "latency_ms": baseline["baseline_latency"],
            "repeat_error_rate": baseline["baseline_repeat_error_rate"],
            "correction_rate": baseline["baseline_correction_rate"],
            "completion_time_ms": baseline["baseline_completion_time"],
        },
        "current": {
            "accuracy": round(current_acc, 4),
            "latency_ms": round(current_latency, 1),
            "repeat_error_rate": round(current_error_rate, 4),
            "correction_rate": round(current_corr_rate, 4),
            "completion_time_ms": round(current_time, 1),
            "difficulty": current_diff,
        },
        "changes": {
            "accuracy_delta": acc_delta,
            "latency_percent_change": latency_pct_change,
            "repeat_error_delta": error_delta,
            "correction_delta": corr_delta,
            "completion_time_percent_change": time_pct_change,
        },
        "difficulty_context": {
            "previous_difficulty": prev_diff,
            "current_difficulty": current_diff,
            "difficulty_changed": diff_changed,
        },
        "supporting_sessions": deviating_sessions_count,
        "reason_codes": list(set(reason_codes)),
        "reasons": list(set(reason_codes)),
        "observation_note": observation_note,
        "trend_description": observation_note,
        "disclaimer": MEDICAL_DISCLAIMER,
    }

def calculate_overall_behavioral_trend(domain_trends: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes overall behavioral trend across all 4 cognitive domains.
    Never characterizes single-domain change as general cognitive decline.
    """
    if not domain_trends:
        return {
            "overall_status": STATUS_INSUFFICIENT_HISTORY,
            "headline": "Insufficient Session History",
            "summary": "Complete daily cognitive exercises to build individual baseline profiles.",
            "recent_change_count": 0,
            "stable_count": 0,
            "improving_count": 0,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

    statuses = [d.get("status") or d.get("trend") for d in domain_trends if (d.get("status") or d.get("trend"))]
    recent_changes = [d for d in domain_trends if (d.get("status") == STATUS_RECENT_CHANGE or d.get("trend") == STATUS_RECENT_CHANGE)]
    improving_count = statuses.count(STATUS_IMPROVING)
    stable_count = statuses.count(STATUS_STABLE)
    variable_count = statuses.count(STATUS_VARIABLE)
    insufficient_count = statuses.count(STATUS_INSUFFICIENT_HISTORY) + statuses.count(STATUS_OBSERVATION_AVAILABLE)

    if insufficient_count == len(domain_trends):
        return {
            "overall_status": STATUS_INSUFFICIENT_HISTORY,
            "headline": "Baseline Calibration In Progress",
            "summary": "Initial baseline calibration is underway. Complete more sessions to unlock longitudinal trends.",
            "recent_change_count": 0,
            "stable_count": 0,
            "improving_count": 0,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

    if len(recent_changes) == 1:
        domain_name = recent_changes[0]["domain_label"]
        return {
            "overall_status": STATUS_RECENT_CHANGE,
            "headline": "Recent Performance Change Worth Monitoring",
            "summary": f"One cognitive activity domain ({domain_name}) shows a recent performance change. Other domains remain stable.",
            "recent_change_count": 1,
            "stable_count": stable_count,
            "improving_count": improving_count,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

    if len(recent_changes) >= 2:
        return {
            "overall_status": STATUS_RECENT_CHANGE,
            "headline": "Recent Performance Changes Across Multiple Domains",
            "summary": f"Recent performance changes observed in {len(recent_changes)} activity domains relative to individual baselines.",
            "recent_change_count": len(recent_changes),
            "stable_count": stable_count,
            "improving_count": improving_count,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

    if improving_count >= 2:
        return {
            "overall_status": STATUS_IMPROVING,
            "headline": "Positive Behavioral Progression",
            "summary": "Consistent performance improvements and steady recall observed across activity domains.",
            "recent_change_count": 0,
            "stable_count": stable_count,
            "improving_count": improving_count,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

    if variable_count >= 2:
        return {
            "overall_status": STATUS_VARIABLE,
            "headline": "Moderate Performance Variance",
            "summary": "Day-to-day score fluctuations observed within normal operational boundaries.",
            "recent_change_count": 0,
            "stable_count": stable_count,
            "improving_count": improving_count,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

    return {
        "overall_status": STATUS_STABLE,
        "headline": "Stable Cognitive Engagement",
        "summary": "Activity performance is well-aligned with established personal baselines across all active domains.",
        "recent_change_count": 0,
        "stable_count": stable_count,
        "improving_count": improving_count,
        "disclaimer": MEDICAL_DISCLAIMER,
    }
