"""
MindMitra - Central Configuration & Domain Mapping for Cognitive Analytics
"""

# Minimum eligible completed sessions required for full longitudinal trend analysis
MIN_TREND_SESSIONS = 5
MIN_OBSERVATION_SESSIONS = 3

# Four MVP Cognitive Domains
DOMAIN_MAPPING = {
    "memory_match": "short_term_memory",
    "daily_routine": "sequential_episodic_memory",
    "object_recognition": "visual_familiar_recognition",
    "pattern_recall": "pattern_attention",
}

GAME_TYPE_ALIASES = {
    "memory_match": "memory_match",
    "memory-match": "memory_match",
    "memoryMatch": "memory_match",
    "short_term_memory": "memory_match",

    "daily_routine": "daily_routine",
    "daily-routine": "daily_routine",
    "dailyRoutine": "daily_routine",
    "routine": "daily_routine",
    "sequential_episodic_memory": "daily_routine",

    "object_recognition": "object_recognition",
    "object-recognition": "object_recognition",
    "objectRecognition": "object_recognition",
    "recognition": "object_recognition",
    "visual_familiar_recognition": "object_recognition",

    "pattern_recall": "pattern_recall",
    "pattern-recall": "pattern_recall",
    "patternRecall": "pattern_recall",
    "pattern_attention": "pattern_recall",
}

def normalize_game_type(game_type: str) -> str:
    if not game_type:
        return ""
    gt = str(game_type).strip()
    return GAME_TYPE_ALIASES.get(gt, gt)

DOMAIN_LABELS = {
    "short_term_memory": "Short-Term Memory",
    "sequential_episodic_memory": "Sequential / Episodic Memory",
    "visual_familiar_recognition": "Visual & Familiar-Person Recognition",
    "pattern_attention": "Pattern Recognition & Attention",
}

DOMAIN_ICONS = {
    "short_term_memory": "🧠",
    "sequential_episodic_memory": "📋",
    "visual_familiar_recognition": "🔍",
    "pattern_attention": "✨",
}

# Trend Status Constants
STATUS_IMPROVING = "improving"
STATUS_STABLE = "stable"
STATUS_VARIABLE = "variable"
STATUS_RECENT_CHANGE = "recent_change"
STATUS_OBSERVATION_AVAILABLE = "observation_available"
STATUS_INSUFFICIENT_HISTORY = "insufficient_history"

# Configurable Thresholds for Deviation
ACCURACY_DEVIATION_THRESHOLD = 0.08         # 8 percentage points below baseline
LATENCY_DEVIATION_THRESHOLD = 0.20          # 20% latency increase above baseline
REPEAT_ERROR_DEVIATION_THRESHOLD = 0.05     # 5 percentage points increase
CORRECTION_DEVIATION_THRESHOLD = 0.05       # 5 percentage points increase
COMPLETION_TIME_DEVIATION_THRESHOLD = 0.25  # 25% time increase

# Minimum sessions out of last 3 that must deviate to qualify as repeated deviation
MIN_DEVIATING_SESSIONS = 2

# Standard Medical Disclaimer
MEDICAL_DISCLAIMER = "Prototype behavioral insight — not a medical diagnosis."
