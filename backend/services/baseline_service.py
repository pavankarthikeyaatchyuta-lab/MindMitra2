"""
MindMitra - Personal Baseline Service
Calculates domain-specific personal baseline metrics using robust statistical methods
from historical eligible sessions (excluding the current session).
"""

import statistics
from typing import List, Dict, Any, Optional

def calculate_personal_baseline(prior_eligible_sessions: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Computes a robust personal baseline for a cognitive domain from prior eligible sessions.
    Returns None if fewer than 1 eligible session exists.
    """
    if not prior_eligible_sessions:
        return None

    accuracies = [float(s["accuracy"]) for s in prior_eligible_sessions if s.get("accuracy") is not None]
    latencies = [float(s["avg_response_time_ms"]) for s in prior_eligible_sessions if s.get("avg_response_time_ms") is not None]
    
    repeat_error_rates = [
        float(s.get("repeat_errors", 0)) / max(float(s.get("total_events", 1)), 1.0)
        for s in prior_eligible_sessions
    ]
    correction_rates = [
        float(s.get("corrections", 0)) / max(float(s.get("total_events", 1)), 1.0)
        for s in prior_eligible_sessions
    ]
    completion_times = [
        float(s["completion_time_ms"]) for s in prior_eligible_sessions if s.get("completion_time_ms") is not None
    ]
    difficulties = [int(s["difficulty"]) for s in prior_eligible_sessions if s.get("difficulty") is not None]

    if not accuracies or not latencies:
        return None

    # Robust baseline calculations (Median & Mean)
    acc_median = float(statistics.median(accuracies))
    acc_mean = float(statistics.mean(accuracies))
    acc_std = float(statistics.stdev(accuracies)) if len(accuracies) > 1 else 0.0
    acc_min = float(min(accuracies))
    acc_max = float(max(accuracies))

    latency_median = float(statistics.median(latencies))
    latency_mean = float(statistics.mean(latencies))
    latency_std = float(statistics.stdev(latencies)) if len(latencies) > 1 else 0.0

    repeat_error_median = float(statistics.median(repeat_error_rates))
    correction_median = float(statistics.median(correction_rates))
    completion_time_median = float(statistics.median(completion_times)) if completion_times else 0.0
    typical_difficulty = int(round(float(statistics.median(difficulties)))) if difficulties else 1

    return {
        "sessions_used": len(prior_eligible_sessions),
        "baseline_mean": round(acc_mean, 4),
        "baseline_median": round(acc_median, 4),
        "baseline_std": round(acc_std, 4),
        "baseline_range": (round(acc_min, 4), round(acc_max, 4)),
        "baseline_latency": round(latency_median, 1),
        "baseline_latency_mean": round(latency_mean, 1),
        "baseline_latency_std": round(latency_std, 1),
        "baseline_repeat_error_rate": round(repeat_error_median, 4),
        "baseline_correction_rate": round(correction_median, 4),
        "baseline_completion_time": round(completion_time_median, 1),
        "typical_difficulty": typical_difficulty,
    }
