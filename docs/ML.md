## On-Device ML Architecture (iQOO Phone-First)

MindMitra features a **dual-tier machine learning architecture**:
1. **Cloud / Python Reference Tier**: Scikit-Learn `RandomForestClassifier` (35 estimators) trained with `StandardScaler` feature normalization.
2. **On-Device Phone Runtime Tier**: Exported decision-tree ensemble (`onDeviceModel.json`) executing directly in client memory via TypeScript (`predictOnDevice`).

```
┌────────────────────────────────────────────────────────┐
│                   ON-DEVICE PHONE RUNTIME              │
│                                                        │
│  User Touch / Cadence                                  │
│           │                                            │
│           ▼                                            │
│  9-Feature Vector Extraction (touchTelemetry.ts)       │
│           │                                            │
│           ▼                                            │
│  StandardScaler Normalization (Exact Float Parity)     │
│           │                                            │
│           ▼                                            │
│  35-Tree Ensemble Traversal (onDeviceInference.ts)     │
│           │                                            │
│           ├─── Median Latency: < 0.001 ms              │
│           ├─── P95 Latency:    0.100 ms                │
│           ├─── Network Calls:  0 (Works 100% Offline)  │
│           └─── Disagreement:   0.00% (500/500 samples) │
│           │                                            │
│           ▼                                            │
│  Adaptive Recommendation: DECREASE / MAINTAIN / INCREASE│
└────────────────────────────────────────────────────────┘
```

### Measured Empirical Benchmarks

- **Device Emulation**: `vivo iQOO Neo9 Pro (V2338A)`, Android 14, Chromium 128 / VivoBrowser
- **Inference Latency**:
  - **Median**: `< 0.001 ms` (0.000 ms high-res timer)
  - **P95**: `0.100 ms`
- **End-to-End Client Adaptation**: `1.51 ms` (touch $\rightarrow$ features $\rightarrow$ model $\rightarrow$ personal baseline)
- **Model Disagreement Rate**: **0.00%** (0 out of 500 test samples; 100% agreement between TypeScript on-device model and Scikit-Learn Python reference)
- **Network Dependency**: **None** (zero HTTP requests during inference)

---

## The 9-Feature Vector

| Feature Index | Feature Name | Description | Range / Unit |
|---|---|---|---|
| `0` | `accuracy` | Task accuracy rate | `0.0 - 1.0` |
| `1` | `mean_response_time_ms` | Average reaction latency | `500 - 10000 ms` |
| `2` | `response_time_variance` | Normalized motor variance | `0.0 - 1.0` |
| `3` | `repeat_error_rate` | Repeated erroneous taps | `0.0 - 1.0` |
| `4` | `correction_rate` | Self-correction frequency | `0.0 - 1.0` |
| `5` | `completion_time_ms` | Total round duration | `10000 - 180000 ms` |
| `6` | `current_difficulty` | Current level | `1 - 5` |
| `7` | `previous_session_accuracy`| Prior round accuracy | `0.0 - 1.0` |
| `8` | `recent_trend` | Performance trajectory | `-1.0 to 1.0` |

---

## Personal Baseline & Guardrails

- **Early Calibration Guardrail**: Profiles with $< 3$ sessions are held in `CALIBRATING` status (`"Learning your usual pattern..."`). No premature deviation alerts are emitted.
- **Profile Isolation**: Grandpa's baseline is strictly calculated from Grandpa's history; Grandma's baseline from Grandma's history (`zero cross-profile population leakage`).
- **Non-Clinical Terminology**: Strictly behavioral observation (`"Meaningful Deviation"`, `"Pacing Adjusted"`). Never issues medical or neurological diagnoses.
- **Office Kit Sync**: Deviations broadcast to caregiver laptops via `POST /api/office-kit/publish` and polling `GET /api/office-kit/latest` (`133.61 ms` measured sync latency).


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
