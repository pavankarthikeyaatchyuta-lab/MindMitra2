# MindMitra 2.0 (माइंडमित्र / మైండ్‌మిత్ర) 🧠📱
### Phone-First Adaptive Cognitive Companion & Real-Time Caregiver Office Kit

<p align="center">
  <a href="https://github.com/pavankarthikeyaatchyuta-lab/MindMitra2">
    <img src="https://img.shields.io/badge/GitHub-MindMitra2-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo" />
  </a>
  <img src="https://img.shields.io/badge/iQOO%20Hackathon%202026-Phone--First%20Validated-blueviolet?style=for-the-badge" alt="iQOO Hackathon" />
  <img src="https://img.shields.io/badge/On--Device%20ML-%3C0.001ms%20Latency-success?style=for-the-badge" alt="On-Device ML" />
  <img src="https://img.shields.io/badge/Cross--Device%20Sync-133ms%20Live-orange?style=for-the-badge" alt="Cross-Device Sync" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/On--Device%20Ensemble-35%20Trees-blue.svg" />
  <img src="https://img.shields.io/badge/Model%20Disagreement-0.00%25-brightgreen.svg" />
  <img src="https://img.shields.io/badge/Airplane%20Mode-100%25%20Offline-success.svg" />
  <img src="https://img.shields.io/badge/Raw%20Media%20Uploads-0%20Bytes-success.svg" />
  <img src="https://img.shields.io/badge/FastAPI-0.109.0-009688.svg?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tests-43%20Passed-brightgreen.svg" />
</p>

---

> 📱 **Phone-First Architecture**: Transforming cognitive wellness from a generic web portal into an adaptive on-device companion that learns an elderly person's individual motor and reaction cadence in real time.
> 
> 🛡️ **Zero-Network ML**: Real 35-tree Random Forest ensemble executing directly in phone memory in **`< 0.001 ms`** with **zero network round-trips**.
> 
> 💻 **Office Kit Live Sync**: Automatic cross-device broadcast from the elderly phone to the caregiver laptop dashboard in **`133 ms`** without page reload.
> 
> 📄 **Validation Report**: See [docs/IQOO_VALIDATION_REPORT.md](docs/IQOO_VALIDATION_REPORT.md) for full empirical benchmarks measured on Android 14 / vivo iQOO Neo9 Pro profile.

---

MindMitra is a **B2C and B2B2C cognitive-wellness and memory companion platform** designed specifically for older adults, family caregivers, and elder-care organizations. Built around the core architecture of **One Caregiver $\rightarrow$ Multiple Elderly Profiles**, MindMitra unifies three vital caregiving dimensions:

1. 🏡 **Home Mode**: Daily individual cognitive workouts with adaptive machine learning, personal baselines, and explainable AI.
2. 👥 **Community Mode**: Facilitator-led group cognitive and social sessions with Pass-and-Play rotation and real activity telemetry.
3. 📞 **Connect Mode**: Account-to-account real-time WebRTC voice calling, live presence detection, and private memory story archives.

---

## 💼 Business Model & Market Strategy

MindMitra operates on a **caregiver-first business model**. The primary beneficiary is the elderly individual, while the paying customer is the family caregiver, senior community center, NGO, or assisted living facility.

```
                                    MINDMITRA ECOSYSTEM
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
1. B2C — FAMILIES                   2. B2B2C — COMMUNITIES / NGOs          3. B2B — CARE FACILITIES
   ├── 1 Caregiver $\rightarrow$ Many Parents  ├── 1 Facilitator $\rightarrow$ Group Circle    ├── Multi-Resident Oversight
   ├── Convenience & Personalization      ├── Shared Single-Device Model         ├── Structured Workflow Integration
   └── Longitudinal Peace of Mind         └── Scalable Hybrid Group Sessions     └── Multi-Caregiver Coordination
```

### 👥 The 3 Customer Segments

1. **B2C — Family Caregivers**:
   - A son, daughter, or guardian supports multiple aging parents or grandparents from one unified account.
   - **Value Driver**: Families pay for convenience, personalization, longitudinal visibility, and peace of mind — not simply games.
2. **B2B2C — Senior Communities & NGOs**:
   - Senior activity centers do not require a separate smartphone for every resident. One facilitator manages group sessions using a shared device paired with offline interaction.
   - **Value Driver**: Scalable activity scheduling, participant management, and structured community session tools.
3. **B2B — Assisted Living & Professional Care Facilities**:
   - Elder-care residences manage dozens of residents and care staff across structured shifts.
   - **Value Driver**: Operational compliance, standardized cognitive enrichment workflows, and care audit logging.

### 💰 Revenue Model

```
                                   MINDMITRA REVENUE
                                          │
    ┌─────────────────────┬───────────────┴───────────────┬─────────────────────┐
    ▼                     ▼                               ▼                     ▼
FAMILY SUBSCRIPTION   COMMUNITY SUBSCRIPTION    CARE FACILITY LICENSE    OPTIONAL ACTIVITY KITS
(B2C Recurring SaaS)  (B2B2C Organization SaaS) (B2B Enterprise SaaS)    (Physical Hybrid Add-on)
- Multi-profile access - Facilitator dashboard   - Multi-caregiver roles  - Physical puzzle boards
- AI baseline insights - Group session tools     - Compliance reporting   - Memory prompt cards
- WebRTC voice calling - Offline session cache   - Priority telemetry     - Tactile sensory tools
```

- **Tiered Recurring Subscriptions**: Pricing scales with the number of managed elderly profiles, active participants, caregiver seats, and facility size, calibrated through ongoing pilot validation.
- **Physical Activity Kits**: Tangible offline activity kits (wooden sequence blocks, themed memory flashcards, art canvases) complementing the digital platform.

---

## 🏛️ The Three Usage Contexts

```
                       ┌─────────────────────────────────────────┐
                       │            CAREGIVER ACCOUNT            │
                       │        Atchyuta Pavan Karthikeya        │
                       └────────────────────┬────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
          ┌──────────────────────┐                      ┌──────────────────────┐
          │  ELDERLY PROFILE 1   │                      │  ELDERLY PROFILE 2   │
          │    Rajesh Kumar      │                      │     Sunita Devi      │
          │     ("Polayya")      │                      │      ("Leelu")       │
          └──────────┬───────────┘                      └──────────┬───────────┘
                     │                                             │
      ┌──────────────┼──────────────┐               ┌──────────────┼──────────────┐
      ▼              ▼              ▼               ▼              ▼              ▼
   🏡 HOME      👥 COMMUNITY    📞 CONNECT       🏡 HOME      👥 COMMUNITY    📞 CONNECT
   MODE            MODE           MODE           MODE            MODE           MODE
```

---

### 1. 🏡 Home Mode (Individual Cognitive Wellness)

Designed for daily independent or guided cognitive workouts.

- **4 Cognitive Activities**:
  - 🧠 **Memory Match**: Working memory & visual recall stimulation.
  - 📋 **Daily Routine**: Sequential reasoning & chronological event ordering.
  - 🔍 **Object Recognition**: Semantic categorization & distractor discrimination.
  - ✨ **Pattern Recall**: Spatial pattern attention & short-term recall.
- **Adaptive Machine Learning**: Real-time `RandomForestClassifier` dynamically scales difficulty (`Level 1–5`) based on accuracy, response latency, and correction rates.
- **Longitudinal Personal Baselines**: 5–10 session rolling median baseline tracking per domain (Memory, Sequential Reasoning, Visual Discrimination, Attention) to detect genuine behavioral trends without population bias.
- **Explainable Caregiver AI**: 3-tier insight gateway (**Tier 1:** Gemini 2.0 Flash ➔ **Tier 2:** Nemotron-3 Super ➔ **Tier 3:** Non-clinical rule engine).
- **Familiar People & Reminders**: Visual cues with caregiver consent and voice-enabled medication/hydration alerts.

---

### 2. 👥 Community Mode (Group Cognitive & Social Sessions)

Designed for community centers, day programs, and family gatherings.

- **Activity Classification**:
  - **Cognitive Group Activities**: *Memory Circle* (category naming, turn timer, response telemetry) & *Sequence Relay* (chronological puzzle arrangement).
  - **Social & Expressive Activities**: *Creative Canvas* (drawing & motor coordination), *Antakshari & Bhajans* (devotional music & mood tracking), *Chai & Chitchat* (structured conversation prompts), *Story Exchange* (cultural folklore sharing).
- **Sequence Relay Engine**:
  - Stripped serial numbers from text to eliminate giveaway hints.
  - Real board-position badges (`Position 1`, `Position 2`, etc.) that update automatically upon swapping cards.
  - Fisher-Yates randomized card shuffles guaranteeing non-trivial start states.
  - Validation engine highlights misplaced positions in amber (`⚠️ Needs adjustment`) without leaking the answer.
  - Pass-and-Play turn advancement serves fresh randomized tasks to subsequent participants.
- **Data Integrity**: Community activities record participation and collaboration telemetry without contaminating the senior's individual clinical baseline trends.

---

### 3. 📞 Connect Mode (Real-Time WebRTC Calling & Memory Stories)

Designed to combat social isolation and maintain trusted family bonds.

```
  ┌────────────────────────┐                             ┌────────────────────────┐
  │   LAPTOP A (Polayya)   │                             │   LAPTOP B (Leelu)     │
  │  Authenticated Profile │                             │  Authenticated Profile │
  └───────────┬────────────┘                             └───────────┬────────────┘
              │                                                      │
              │ 1. POST /api/call/signal (Offer)                     │ 2. Background Polling (1.2s)
              │    Heartbeat (3s)                                    │    Heartbeat (3s)
              ▼                                                      ▼
  ┌───────────────────────────────────────────────────────────────────────────────┐
  │                 POSTGRESQL DATABASE SIGNALING & PRESENCE                      │
  │   - Table: call_signals (queued offer, answer, ice-candidates, hangup)       │
  │   - Table: active_presence (live heartbeats < 25s = Online)                  │
  └───────────────────────────────────────────────────────────────────────────────┘
              │                                                      │
              │                                                      │ 3. Global Call Banner:
              │                                                      │    "Incoming call from Polayya"
              │                                                      │    [ Accept ]
              │                                                      ▼
              │ 4. POST /api/call/signal (Answer) ◀──────────────────┘
              ▼
  ┌───────────────────────────────────────────────────────────────────────────────┐
  │                     PEER-TO-PEER WEBRTC AUDIO STREAM                          │
  │               Polayya ◀══════ (Encrypted Live Audio) ══════▶ Leelu            │
  └───────────────────────────────────────────────────────────────────────────────┘
```

- **Database-Persisted Signaling**: Solves serverless Lambda memory isolation by storing signals in PostgreSQL (`call_signals` and `active_presence`), guaranteeing 100% reliable cross-device delivery.
- **Global Incoming Call Overlay**: Runs continuously at the root application shell (`GlobalCallOverlay.tsx`). Leelu receives incoming calls instantly on **any page** without manual refresh.
- **Trusted Contact Model**:
  - **Type A (MindMitra Contact)**: Authenticated account with `target_user_id`, `caregiver_name`, live presence status (`● Online` vs `○ Standby`), and 1-tap WebRTC voice calling `[ Call ]`.
  - **Type B (External Contact)**: Family members with `phone_number`, `caregiver_name`, and direct telephone dialing modal `[ Phone Call ]`.
- **Audio Resilience**:
  - 25-second calling timeout with automatic transition to `UNAVAILABLE`.
  - Safe microphone permission acquisition with clear user guidance.
  - Live duration timer, microphone mute toggle, and peer hangup synchronization.
- **Private Voice Memory Stories**: Real microphone audio recording (`MediaRecorder` API) with waveform playback and categorized archive.

---

## 🏗️ System Architecture

```
                                    CLIENT LAYER
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Recharts     │
  │  ├── Global Call Context (WebRTC state machine, audio tracks, heartbeats)   │
  │  ├── Global Incoming Call Overlay (Multi-page ring banner & in-call HUD)    │
  │  ├── Multilingual Translation Engine (English, Hindi, Telugu)                │
  │  ├── Offline Storage & Telemetry Queue (IndexedDB / LocalStorage)            │
  │  └── Elderly Touch UI (Touch targets ≥ 48px, high contrast, warm theme)      │
  └──────────────────────────────────────┬───────────────────────────────────────┘
                                         │ HTTPS / REST JSON
                                         ▼
                                   BACKEND LAYER
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  FastAPI (Modular Monolith, Python 3.10+)                                    │
  │  ├── Auth & Caregiver Isolation (PBKDF2 Hashing + JWT Token Verification)    │
  │  ├── Session Orchestrator (Multi-game lifecycle & community event tracking)  │
  │  ├── Database-Backed WebRTC Signaling & Heartbeat Presence Registry          │
  │  ├── Adaptive ML Pipeline (Scikit-Learn RandomForestClassifier)              │
  │  ├── Longitudinal Trend Engine (5–10 session personal median baselines)      │
  │  └── 3-Tier Explainability Gateway (Gemini 2.0 Flash / Nemotron / Fallback)  │
  └──────────────────┬────────────────────────────────────────┬──────────────────┘
                     │                                        │
                     ▼                                        ▼
             DATA PERSISTENCE                         EXTERNAL SERVICES
  ┌────────────────────────────────────┐   ┌─────────────────────────────────────┐
  │ SQLite (Dev) / PostgreSQL (Prod)   │   │ Google Gemini 2.0 Flash API         │
  │ ├── caregivers & elderly_profiles  │   │ OpenRouter Nemotron-3 Super API     │
  │ ├── sessions & game_sessions       │   │ STUN / TURN NAT Traversal Servers   │
  │ ├── game_events & community_events │   │ Web Speech Synthesis Audio Engine   │
  │ ├── trusted_connections            │   │ Vercel Serverless Production Edge   │
  │ ├── active_presence (heartbeats)   │   └─────────────────────────────────────┘
  │ ├── call_signals (WebRTC queue)    │
  │ ├── memory_stories & reminders     │
  │ └── sync_queue                     │
  └────────────────────────────────────┘
```

---

## 🤖 Adaptive Difficulty Machine Learning Pipeline (`ml/`)

```
[ Gameplay Telemetry ] ──▶ [ Feature Extraction ] ──▶ [ RandomForestClassifier ] ──▶ [ Difficulty Decision ]
- accuracy                  - Normalization            - 100 Estimators              - DECREASE (0)
- response_time_ms          - Outlier Clipping         - Max Depth: 8                - MAINTAIN (1)
- repeat_error_rate         - Trend Vectorization      - 90.1% Validation Acc        - INCREASE (2)
```

- **Input Features**: `accuracy`, `mean_response_time_ms`, `response_time_variance`, `repeat_error_rate`, `correction_rate`, `completion_time_ms`, `current_difficulty`, `previous_session_accuracy`, `recent_trend`.
- **Target Actions**:
  - `DECREASE (0)`: Lowers complexity when fatigue or confusion is detected.
  - `MAINTAIN (1)`: Sustains level when performance matches comfortable engagement.
  - `INCREASE (2)`: Advances level when high speed and low error rates are sustained.

---

## 📡 Complete API Reference

### 🔐 Caregiver Authentication & Multi-Profile Management
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register caregiver account with secure PBKDF2 salt |
| `POST` | `/api/auth/login` | Login caregiver & generate JWT bearer token |
| `GET` | `/api/auth/me` | Validate session token & fetch caregiver info |
| `GET` | `/api/profiles` | List all active elderly profiles for caregiver |
| `POST` | `/api/profiles` | Create new elderly profile under caregiver |
| `PUT` | `/api/profiles/{id}` | Update elderly profile settings |
| `DELETE` | `/api/profiles/{id}` | Permanently delete profile and cascade all data |

### 🎮 Cognitive Games & Baseline Analytics
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions/start` | Start individual daily cognitive session |
| `POST` | `/api/sessions/{id}/complete` | Complete session & trigger trend analysis |
| `POST` | `/api/games/session/start` | Launch specific game activity |
| `POST` | `/api/games/session/{id}/complete` | Record activity telemetry & completion metrics |
| `POST` | `/api/adaptive/recommend` | Evaluate ML model for difficulty adjustment |
| `GET` | `/api/analytics/trends/{user_id}` | Calculate 5–10 session personal median baselines |
| `POST` | `/api/explain/insight` | Generate 3-tier Gemini / Nemotron clinical insight |

### 👥 Community Mode Sessions
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/community/sessions/start` | Initialize group community session |
| `POST` | `/api/community/sessions/{id}/complete` | Conclude group session with participant notes |
| `POST` | `/api/community/sessions/{id}/abandon` | Discard incomplete group session |
| `POST` | `/api/community/events` | Record live activity telemetry & turn actions |
| `GET` | `/api/community/sessions/caregiver/{id}`| List past community sessions |

### 💻 Office Kit Real-Time Cross-Device Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/office-kit/publish` | Broadcasts approved behavioral telemetry summary from elderly phone |
| `GET` | `/api/office-kit/latest` | Serves newest deviation packet to subscribed caregiver laptop dashboards |
| `GET` | `/api/office-kit/history` | Fetches historical session packets with timestamps and reason codes |

### 📞 Connect Mode & WebRTC Real-Time Calling
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/connections/profile/{id}` | Fetch approved Type A & Type B contacts |
| `POST` | `/api/connections` | Add trusted contact (MindMitra or External) |
| `DELETE` | `/api/connections/{id}` | Remove trusted contact |
| `POST` | `/api/presence/heartbeat` | Register real-time online heartbeat in DB |
| `GET` | `/api/call/presence/{target_id}` | Check live presence status (online if heartbeat < 25s) |
| `POST` | `/api/call/signal` | Queue WebRTC signal (offer, answer, ICE, hangup) |
| `GET` | `/api/call/signals/{target_id}` | Poll pending signals & mark as delivered |
| `POST` | `/api/call/end` | Terminate active call & notify peer |
| `GET` | `/api/stories/profile/{id}` | Retrieve private memory audio stories |
| `POST` | `/api/stories` | Save microphone memory recording |

---

## 📱 iQOO Phone-First Core Pillars & Empirical Benchmarks

MindMitra 2.0 was specifically validated under an Android 14 / vivo iQOO Neo9 Pro device profile:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        EMPIRICAL AUDIT RESULTS (vivo iQOO Neo9 Pro)                    │
│                                                                                        │
│  - Single Model Inference Latency:   < 0.001 ms (Median) • 0.100 ms (P95)              │
│  - Python Reference Disagreement:    0.00% (0 / 500 test samples)                      │
│  - End-to-End Client Adaptation:     1.51 ms (Touch ──► ML ──► Personal Baseline)      │
│  - Office Kit Cross-Device Sync:     133.61 ms (Zero-Reload Live Sync to Laptop)       │
│  - Airplane Mode Offline Operation:  100% Operational (0 Network Requests)             │
│  - Raw Audio / Photo Cloud Upload:   0 Bytes (All local canvas / Web Speech)           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **On-Device Random Forest**: Real 35-tree ensemble converted from Scikit-Learn into JSON and executed directly in client memory with zero cloud network overhead.
2. **Sensory Behavioral Telemetry**:
   - **Touch**: Real touch events capture reaction latency, inter-tap cadence, hesitation intervals ($\ge 3$s), and repeat error rates.
   - **Voice**: Verbal recall measures cadence and pause durations locally; zero raw audio files are stored or uploaded.
   - **Camera**: Local 2D canvas face recognition for familiar person verification; zero camera frames leave the device.
3. **Personal Baseline Guardrails**:
   - Minimum 3 sessions required before deviation flags are active (`CALIBRATING` state).
   - Strict profile isolation ensures Grandma's metrics never cross-contaminate Grandpa's baseline.
   - Non-clinical behavioral observation terminology throughout.
4. **Office Kit Cross-Device Live Sync**: Real-time broadcast from elderly phone (`/personal-pattern`) to caregiver laptop (`/office-kit`) via background transport without refreshing the browser.
5. **Interactive Judge Demo**: Instant verification of Normal vs. Degraded scenarios at `/judge-demo`.

---

## 🚀 Quickstart & Local Development

### 1. Local Setup
```bash
# Clone the repository
git clone https://github.com/pavankarthikeyaatchyuta-lab/MindMitra2.git
cd MindMitra2

# Backend Setup
cd backend
pip install -r requirements.txt
cp .env.example .env
# Configure GEMINI_API_KEY / OPENROUTER_API_KEY in backend/.env (optional)
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend Setup (in a separate terminal)
cd ../frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```
- **Phone Access (on same Wi-Fi)**: `http://<YOUR_LAN_IP>:3000/personal-pattern`
- **Caregiver Office Kit (Laptop)**: `http://localhost:3000/office-kit`
- **Judge Demo**: `http://localhost:3000/judge-demo`
- **Interactive API Docs**: `http://localhost:8000/docs`

### 2. Run Verification Test Suites
```bash
# 1. Run Backend Validation Tests (5/5 Passing)
python -m pytest backend/test_iqoo_validation_suite.py -v

# 2. Run All Backend Tests (43 Passing)
python -m pytest backend/ -v

# 3. Run E2E Mobile Device Puppeteer Audit (10-Point Checklist)
node frontend/scripts/test_iqoo_e2e_audit.mjs
```

---

## ⚖️ Ethical Guardrails & Medical Disclaimer

MindMitra is an **assistive cognitive engagement, social connectivity, and behavioral observation companion** — **NOT a clinical medical device**.

- 🚫 **Never Diagnoses**: MindMitra does not diagnose, treat, or claim to cure Alzheimer's, dementia, or any neurological condition.
- 🚫 **Zero Hallucinated Metrics**: Longitudinal metrics reflect genuine recorded gameplay telemetry compared against the individual's personal baseline.
- 🛡️ **Mandatory Disclaimer Banner**:
  > *"Prototype behavioral insight — not a medical diagnosis. Cognitive engagement metrics track activity variance. Always consult a qualified healthcare professional for persistent health concerns."*
- 🔒 **Data Privacy**: Family photos, contact phone numbers, and voice recordings remain isolated under caregiver ownership and are never used to train external public models.

---

## 👥 Authors & Acknowledgments
- **Project Lead**: Atchyuta Pavan Karthikeya
- **Repository**: [https://github.com/pavankarthikeyaatchyuta-lab/MindMitra2](https://github.com/pavankarthikeyaatchyuta-lab/MindMitra2)
- **Validation Report**: [docs/IQOO_VALIDATION_REPORT.md](docs/IQOO_VALIDATION_REPORT.md)
