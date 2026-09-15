# MindMitra 2.0 Phone-First Architecture

## System Overview: Phone-First Companion & Office Kit Bridge

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ELDERLY PHONE RUNTIME (iQOO / Android)                          │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                 SENSORY TELEMETRY                                │  │
│  │  Touch Sensor Engine        Voice Pacing Tracker       Familiar Face (Canvas)    │  │
│  │  (cadence, hold, error)     (latency, pauses, speech)  (local match, zero cloud) │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                         │ (Real Interaction Vectors)                   │
│  ┌──────────────────────────────────────▼───────────────────────────────────────────┐  │
│  │                              ON-DEVICE CORE LOOP                                 │  │
│  │   StandardScaler Parity  ──►  Random Forest (35 Trees)  ──►  Adaptive Pacing     │  │
│  │   (offline in-memory)         (< 0.001 ms Latency)           (immediate change)  │  │
│  │                                      │                                           │  │
│  │                                      ▼                                           │  │
│  │                        Personal Baseline Engine                                  │  │
│  │       (3-Session Calibration Guardrail • Strict Grandpa/Grandma Isolation)        │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                         │                                              │
│                                         │ 100% OPERATIONAL IN AIRPLANE MODE            │
└─────────────────────────────────────────┼──────────────────────────────────────────────┘
                                          │
                   LAN Wi-Fi Transport    │ (Summary Packets Only • Zero Raw Audio/Image)
                   (POST /api/office-kit/publish)
                                          │
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                BACKEND (FastAPI / SQLite)                              │
│                                                                                        │
│  - /api/office-kit/publish ──► Stores approved summary packets                         │
│  - /api/office-kit/latest  ──► Serves newest packet to subscribed laptop dashboards   │
│  - Caregiver Authentication, Longitudinal Trends, Database Storage                     │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │
                   Polling (1.5s Interval)│ (Zero Page Reload)
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         CAREGIVER LAPTOP (Office Kit View)                             │
│                                                                                        │
│  - /office-kit Dashboard: Real-time non-clinical observation cards                     │
│  - Live latency alerts, trend indicators, and recommended adjustments                  │
│  - Measured Cross-Device Sync Latency: ~133 ms                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## The Complete Adaptive Cycle

```
TOUCH / VOICE INPUT
        │
        ▼
BEHAVIORAL FEATURE EXTRACTION (touchTelemetry.ts, voiceTelemetry.ts)
        │
        ▼
ON-DEVICE ML INFERENCE (onDeviceInference.ts: 35-tree ensemble, < 0.001 ms)
        │
        ▼
PERSONAL BASELINE COMPARISON (personalBaselineEngine.ts: rolling median)
        │
        ├── If < 3 sessions: CALIBRATING (no premature alerts)
        ├── If normal: NORMAL
        └── If degraded: MEANINGFUL_DEVIATION
        │
        ▼
REAL-TIME ADAPTATION (GamePage.tsx / PersonalPatternExperience.tsx)
        │
        ▼
OFFICE KIT REAL-TIME SYNC (officeKitBridge.ts: 133 ms to laptop without refresh)
```

---

## Key Components

### 1. On-Device ML (`frontend/src/services/onDeviceInference.ts`)
- Decision tree ensemble translated directly from `ml/model.pkl` to `onDeviceModel.json`.
- 100% mathematical fidelity with Scikit-Learn reference (`0.00% disagreement` across 500 samples).
- Executes synchronously in client memory with zero network delay.

### 2. Behavioral Telemetry (`frontend/src/services/touchTelemetry.ts`, `voiceTelemetry.ts`)
- **Touch**: Captures reaction time, inter-tap intervals, pauses $\ge 3$s, repeated error taps, correction ratio.
- **Voice**: Captures sequence completeness, hesitation pauses via Web Speech API; zero audio uploaded.
- **Camera**: Local 2D canvas frame verification; zero pictures stored or transmitted.

### 3. Personal Baseline Engine (`frontend/src/services/personalBaselineEngine.ts`)
- Profile isolation prevents cross-individual data contamination (e.g. Rajesh Kumar vs Sunita Devi).
- 3-session calibration minimum ensures elderly users are not mislabeled as fatigued early on.
- Uses strictly non-clinical behavioral observation terms.

### 4. Office Kit Cross-Device Bridge (`frontend/src/services/officeKitBridge.ts`)
- Enables a physical caregiver laptop to display live status from an elderly person's phone in real time.
- Uses dual transport: local `BroadcastChannel` (for same-device tabs) + backend API polling (for separate physical devices).
