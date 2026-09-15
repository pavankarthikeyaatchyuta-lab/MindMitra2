# MindMitra Data Documentation

## Primary Dataset: MindMitra Gameplay Dataset

### Purpose
Training data for the adaptive difficulty ML model.

### Source
Synthetically generated via `ml/synthetic_data.py`

### Schema
| Column | Type | Description |
|--------|------|-------------|
| accuracy | float | Game accuracy (0.0-1.0) |
| mean_response_time_ms | float | Average response time in ms |
| response_time_variance | float | Variance in response times |
| repeat_error_rate | float | Rate of repeated errors |
| correction_rate | float | Self-correction rate |
| completion_time_ms | float | Total completion time in ms |
| current_difficulty | int | Current difficulty level (1-5) |
| previous_session_accuracy | float | Previous session accuracy |
| recent_trend | float | Performance trend (-1.0 to 1.0) |
| label | int | Target: 0=DECREASE, 1=MAINTAIN, 2=INCREASE |

### Generation
```bash
python ml/synthetic_data.py --samples 5000
```

---

## Reference Datasets (Optional)

These datasets are used for research/reference or optional experimentation and are NOT used to claim clinical diagnosis or validation.

### 1. Alzheimer's Disease Dataset
- **Records**: ~2,149
- **Purpose**: Research reference for cognitive domain exploration
- **NOT used for**: Training MindMitra diagnostic models

### 2. Dementia Dataset
- **Records**: ~373
- **Purpose**: Research reference
- **NOT used for**: Training MindMitra diagnostic models

### 3. Cognitive Impairment Dataset
- **Records**: ~1,200 (original), ~5,000 (expanded)
- **Purpose**: Research reference for feature exploration
- **NOT used for**: Training MindMitra diagnostic models

> **Important**: The application functions fully without these reference datasets. They are completely optional.

---

## Runtime Data

### SQLite Database (mindmitra.db)
Generated at runtime with tables:
- `users` — User profiles
- `sessions` — Cognitive session records
- `game_sessions` — Individual game performance records
- `game_events` — Raw telemetry events
- `adaptive_decisions` — ML/rule-based difficulty decisions
- `reminders` — User reminders
- `sync_queue` — Offline sync queue

### Privacy
- No raw audio stored
- No camera data collected
- No unnecessary personal information
- Minimal profile data (name, age, language preference)
