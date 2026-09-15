# MindMitra ML Documentation

## Overview

MindMitra uses machine learning for adaptive difficulty adjustment in cognitive games. The ML system observes gameplay behavior and recommends whether to increase, maintain, or decrease difficulty for the next session.

> **Important**: This is a prototype model evaluated on synthetic gameplay data. It is NOT a clinical diagnostic model.

## Architecture

### Pipeline
```
Synthetic Data → Feature Engineering → Model Training → Prediction API
```

### Model: RandomForestClassifier
- **Library**: scikit-learn
- **Type**: Multi-class classification (3 classes)
- **Classes**: DECREASE (0), MAINTAIN (1), INCREASE (2)

### Features
| Feature | Description | Range |
|---------|-------------|-------|
| accuracy | Game accuracy rate | 0.0 - 1.0 |
| mean_response_time_ms | Average response time | 500 - 10000 ms |
| response_time_variance | Variance in response times | 0.0 - 1.0 |
| repeat_error_rate | Rate of repeated mistakes | 0.0 - 1.0 |
| correction_rate | Rate of self-corrections | 0.0 - 1.0 |
| completion_time_ms | Total game completion time | 10000 - 180000 ms |
| current_difficulty | Current difficulty level | 1 - 5 |
| previous_session_accuracy | Previous session accuracy | 0.0 - 1.0 |
| recent_trend | Performance trend direction | -1.0 to 1.0 |

### Feature Importances (Prototype Evaluation)
- mean_response_time_ms: ~48%
- repeat_error_rate: ~17%
- accuracy: ~16%
- Other features: ~19% combined

## Synthetic Data Generation

The `synthetic_data.py` script generates training data with realistic correlations:

- **High performers** (accuracy > 0.85, low latency) → INCREASE label
- **Moderate performers** (mixed metrics) → MAINTAIN label
- **Struggling performers** (accuracy < 0.5, high latency) → DECREASE label
- Noise and edge cases are added for realism

## Deterministic Fallback

When the ML model is unavailable, deterministic rules apply:

```python
if accuracy < 0.5 or mean_response_time > 6000ms:
    → DECREASE difficulty
elif accuracy > 0.85 and mean_response_time < 2500ms and repeat_errors < 0.1:
    → INCREASE difficulty
else:
    → MAINTAIN difficulty
```

The fallback is transparent: `model_used: "fallback"` is returned.

## Prototype Evaluation Results

- **Accuracy**: ~90% on synthetic test data
- **Dataset**: 5000 synthetic gameplay samples
- **Split**: 80% train / 20% test

> These metrics represent prototype model evaluation on synthetic gameplay data. They do NOT represent clinical validation.

## What This ML System Does NOT Do

- ❌ Diagnose dementia or Alzheimer's
- ❌ Predict medical cognitive decline
- ❌ Replace clinical cognitive assessments
- ❌ Use external clinical datasets for training

## What This ML System DOES

- ✅ Adapts game difficulty to user performance
- ✅ Personalizes the cognitive engagement experience
- ✅ Provides transparent difficulty recommendations
- ✅ Falls back gracefully when the model is unavailable
