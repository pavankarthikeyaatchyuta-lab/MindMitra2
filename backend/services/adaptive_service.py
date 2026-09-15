"""
MindMitra - Adaptive AI Difficulty Service
Answers: "What difficulty should the user receive next?"
Completely decoupled from the Trend Engine.
Uses RandomForest / GradientBoosting model if available, else deterministic heuristic fallback.
"""

import os
import sys
from typing import Dict, Any, Optional

# Add ml path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'ml'))

try:
    from predict import predict_difficulty as ml_predict_difficulty
    ML_AVAILABLE = True
except Exception:
    ML_AVAILABLE = False

def recommend_next_difficulty(
    user_id: int,
    game_type: str,
    metrics: Dict[str, Any],
    current_difficulty: int
) -> Dict[str, Any]:
    """
    Determines next difficulty level (1-5) using gameplay telemetry features.
    """
    acc = float(metrics.get("accuracy", 0.75))
    latency = float(metrics.get("mean_response_time_ms", 2500))
    repeat_err = float(metrics.get("repeat_error_rate", 0.05))
    corr_rate = float(metrics.get("correction_rate", 0.05))

    # 1. Attempt ML model
    if ML_AVAILABLE:
        try:
            pred = ml_predict_difficulty({
                "accuracy": acc,
                "mean_response_time_ms": latency,
                "response_time_variance": float(metrics.get("response_time_variance", 0.15)),
                "repeat_error_rate": repeat_err,
                "correction_rate": corr_rate,
                "completion_time_ms": float(metrics.get("completion_time_ms", 30000)),
                "current_difficulty": current_difficulty,
                "previous_session_accuracy": float(metrics.get("previous_session_accuracy", acc)),
                "recent_trend": float(metrics.get("recent_trend", 0.0)),
            })
            rec = pred.get("recommendation", "MAINTAIN")
            conf = pred.get("confidence", 0.85)
            imp = pred.get("feature_importance", {})
            model_used = "ml"
        except Exception:
            rec = None
    else:
        rec = None

    # 2. Fallback heuristic rules
    if not rec:
        model_used = "fallback"
        conf = 0.80
        imp = {"accuracy": 0.45, "mean_response_time_ms": 0.35, "repeat_error_rate": 0.20}
        if acc < 0.50 or (acc < 0.65 and latency > 4500):
            rec = "DECREASE"
        elif acc >= 0.85 and latency < 3000 and repeat_err < 0.10:
            rec = "INCREASE"
        else:
            rec = "MAINTAIN"

    # Calculate recommended difficulty level
    if rec == "INCREASE":
        new_diff = min(current_difficulty + 1, 4)
        reason = "Consistent high accuracy and prompt response times indicate readiness for advanced challenge."
    elif rec == "DECREASE":
        new_diff = max(current_difficulty - 1, 1)
        reason = "Difficulty adjusted to maintain confidence, comfort, and positive engagement."
    else:
        new_diff = current_difficulty
        reason = "Performance is well-balanced; maintaining current difficulty level for stability."

    return {
        "recommendation": rec,
        "recommended_difficulty": new_diff,
        "previous_difficulty": current_difficulty,
        "confidence": conf,
        "reason": reason,
        "model_used": model_used,
        "feature_importance": imp,
    }
