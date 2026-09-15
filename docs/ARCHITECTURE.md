# MindMitra Architecture

## System Overview

```
┌──────────────────────────────────────────────────┐
│                    Frontend                       │
│  React + TypeScript + Vite + Tailwind CSS        │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Elderly  │  │  Games   │  │  Caregiver   │   │
│  │   UI     │  │ Engine   │  │  Dashboard   │   │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │               │            │
│  ┌────┴──────────────┴───────────────┴────┐      │
│  │     Telemetry / API Service Layer      │      │
│  │     + IndexedDB Offline Storage        │      │
│  └────────────────┬───────────────────────┘      │
└───────────────────┼──────────────────────────────┘
                    │ HTTP/REST
┌───────────────────┼──────────────────────────────┐
│                   ▼     Backend                   │
│            FastAPI (Python)                       │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Session  │  │Analytics │  │  Adaptive    │   │
│  │ Manager  │  │ Engine   │  │  ML Engine   │   │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │               │            │
│  ┌────┴──────────────┴───────────────┴────┐      │
│  │            SQLite Database             │      │
│  └────────────────────────────────────────┘      │
│                                                   │
│  ┌──────────────────┐  ┌─────────────────┐       │
│  │  Gemini API      │  │  ML Pipeline    │       │
│  │  (Explanations)  │  │  (scikit-learn) │       │
│  └──────────────────┘  └─────────────────┘       │
└──────────────────────────────────────────────────┘
```

## Data Flow

### PLAY → OBSERVE → LEARN → ADAPT → TRACK → EXPLAIN → SUPPORT

1. **PLAY**: User plays cognitive games (Memory Match, Daily Routine, Object Recognition)
2. **OBSERVE**: Telemetry system captures every interaction (accuracy, latency, errors)
3. **LEARN**: ML model (RandomForest) learns patterns from gameplay data
4. **ADAPT**: Adaptive engine adjusts game difficulty based on ML predictions
5. **TRACK**: Baseline engine tracks longitudinal performance against personal history
6. **EXPLAIN**: Analytics service generates structured insights; Gemini converts to caregiver language
7. **SUPPORT**: Caregiver dashboard presents trends, insights, and actionable information

## Key Components

### Frontend Architecture
- **LanguageProvider**: i18n context (English/Hindi)
- **AppContext**: Global state (user, session, difficulty, online status)
- **Telemetry Hook**: Game event recording with offline queueing
- **Voice Hook**: Web Speech API wrapper
- **Offline Storage**: IndexedDB/localStorage for offline-first operation

### Backend Architecture
- **Modular Monolith**: Single FastAPI application with logical separation
- **SQLite**: Local database for all persistence
- **Gemini Service**: API integration with strict prompting and template fallback
- **Adaptive Service**: ML model loading with deterministic fallback rules

### ML Pipeline
- **Synthetic Data**: Configurable generator with realistic gameplay patterns
- **Feature Engineering**: StandardScaler normalization
- **Training**: RandomForestClassifier with train/test evaluation
- **Prediction**: Model-based prediction with transparent fallback
