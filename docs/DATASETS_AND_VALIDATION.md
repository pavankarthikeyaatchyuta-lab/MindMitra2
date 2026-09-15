# MindMitra Datasets & Technical Validation Reference
### iQOO Hackathon 2026

---

## 1. Executive Summary & Mandatory Boundary

> ⚠️ **IMPORTANT REGULATORY & CLINICAL BOUNDARY**:
> **MindMitra is NOT a clinical medical device.** It does not diagnose, treat, or claim to cure Alzheimer's disease, dementia, or any neurological condition. 
> There is a strict, unambiguous separation between **Technical Model Validation** (evaluating whether machine learning algorithms accurately detect behavioral gameplay variance) and **Clinical Validation** (clinical trials measuring diagnostic efficacy on patient populations). **MindMitra has NOT undergone clinical validation.**

---

## 2. Comprehensive Inventory of Datasets in `datasets/`

MindMitra's repository contains four tabular CSV files under `datasets/`. Below is the factual analysis of each file, its schema, labels, and role:

| Dataset File | Rows | Columns | Supported Task / Model Role | Used in Active Training? |
|---|---|---|---|---|
| `alzheimers_disease_data.csv` | 2,149 | 35 | Research Reference: Demographic & MMSE Distribution | No (Benchmark / Exploration) |
| `cognitive_impairment_dataset.csv` | 1,200 | 16 | Research Reference: Cognitive & Depressive Score Trends | No (Benchmark / Exploration) |
| `cognitive_impairment_dataset_increased_5000.csv` | 5,000 | 16 | Scaled Reference: Score distributions across age cohorts | No (Benchmark / Exploration) |
| `dementia_dataset.csv` (OASIS) | 373 | 15 | Academic Benchmark: Longitudinal score progression | No (Benchmark / Exploration) |

### Active Production & On-Device ML Dataset: `synthetic_gameplay.csv`
- **Location**: `ml/data/synthetic_gameplay.csv` (generated via `ml/synthetic_data.py`)
- **Size**: 5,000 gameplay sessions
- **Role**: Powers both the **Cloud Scikit-Learn RandomForestClassifier** and the **On-Device Mobile 35-Tree Ensemble** (`onDeviceModel.json`).
- **Features (9)**:
  1. `accuracy` (0.0 - 1.0)
  2. `mean_response_time_ms` (500 - 10,000 ms)
  3. `response_time_variance` (0.0 - 1.0)
  4. `repeat_error_rate` (0.0 - 1.0)
  5. `correction_rate` (0.0 - 1.0)
  6. `completion_time_ms` (10,000 - 180,000 ms)
  7. `current_difficulty` (Level 1 - 5)
  8. `previous_session_accuracy` (0.0 - 1.0)
  9. `recent_trend` (-1.0 to 1.0)
- **Target Classes**:
  - `0`: **DECREASE** (reduce task difficulty when fatigue or hesitation is observed)
  - `1`: **MAINTAIN** (sustain current level when engagement is balanced)
  - `2`: **INCREASE** (advance challenge when rapid recall and low error rates occur)

---

## 3. Detailed Dataset Audits

### Dataset 1: `alzheimers_disease_data.csv`
- **Schema Highlights**: `Age`, `Gender`, `EducationLevel`, `BMI`, `Smoking`, `AlcoholConsumption`, `MMSE`, `FunctionalAssessment`, `MemoryComplaints`, `BehavioralProblems`, `ADL`, `Confusion`, `Diagnosis`.
- **Validation**: High data completeness; standard synthetic clinical distribution derived from Kaggle research datasets.
- **Why it is NOT used in real-time inference**:
  MindMitra observes **real-time interaction telemetry** (tap latency, pause duration, touch cadence), NOT invasive clinical or medical history. Using static clinical datasets for interactive difficulty scaling would introduce clinical misattribution.

### Dataset 2 & 3: `cognitive_impairment_dataset.csv` and `cognitive_impairment_dataset_increased_5000.csv`
- **Schema Highlights**: `Age`, `Gender`, `Chronic_Diseases`, `Glucose_Level`, `BMI`, `MMSE_Score`, `GDS_Score`, `Sleep_Quality_Score`, `Cognitive_Impairment_Status`.
- **Role**: Demonstrates how lifestyle factors correlate with MMSE baseline shifts in academic literature. Used to inform the non-clinical reason codes in the caregiver explainability gateway.

### Dataset 4: `dementia_dataset.csv` (Open Access Series of Imaging Studies - OASIS)
- **Schema Highlights**: `Subject ID`, `MRI ID`, `Group` (Demented/Nondemented/Converted), `Visit`, `Age`, `EDUC`, `SES`, `MMSE`, `CDR`, `eTIV`, `nWBV`, `ASF`.
- **Role**: Longitudinal milestone reference for validating that cognitive variability naturally fluctuates across multi-visit observations.

---

## 4. Technical Validation vs. Clinical Validation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TECHNICAL PIPELINE VALIDATION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✓ Synthetically generated 5,000 session telemetry dataset                  │
│  ✓ 80/20 train/test split with cross-validation                             │
│  ✓ 90.1% classification accuracy on synthetic telemetry                     │
│  ✓ On-device JavaScript inference engine verified against Scikit-Learn      │
│  ✓ 35-tree ensemble pruned to 956 KB with < 2.0ms mobile execution latency   │
│  ✓ 33 automated backend unit and security tests passing                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ≠
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLINICAL VALIDATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ❌ MindMitra has NOT undergone randomized clinical trials                  │
│  ❌ MindMitra does NOT predict or diagnose dementia or Alzheimer's          │
│  ❌ MindMitra does NOT replace clinical psychometric assessments (e.g. MoCA) │
│  ❌ MindMitra metrics are behavioral observations, not neurological markers  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Ethical Guardrails & Prohibited Terminology

In accordance with responsible AI guidelines:
1. **Prohibited UI Phrases**:
   - 🚫 "Dementia Detection"
   - 🚫 "Early Alzheimer's Diagnosis"
   - 🚫 "Cognitive Decline Diagnosis"
   - 🚫 "Disease Stage Progression"
2. **Approved UI Phrases**:
   - ✅ "Personal Behavioral Baseline"
   - ✅ "Learning Your Usual Pattern"
   - ✅ "Meaningful Deviation"
   - ✅ "Adaptive Cognitive Engagement"
   - ✅ "Caregiver Observation Summary"
