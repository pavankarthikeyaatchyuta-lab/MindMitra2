# MindMitra Demo Guide

## Quick Demo (for Judges)

### Setup (One-time)
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### Demo Walkthrough

#### 1. Open the App
- Navigate to http://localhost:3000
- You'll see the MindMitra welcome screen

#### 2. Seed Demo Data
- Navigate to http://localhost:3000/demo
- Click "Seed Demo Data"
- This creates demo users with 15 historical sessions each

#### 3. Start a Session
- Return to home (/)
- Select "Rajesh Kumar" (stable user) or create a new user
- Click "Start Session"

#### 4. Play Cognitive Games
- **Memory Match**: Flip cards to find matching pairs
- **Daily Routine**: Arrange daily activities in correct order
- **Object Recognition**: Identify objects from multiple choices
- Each game captures telemetry and adapts difficulty

#### 5. View Caregiver Dashboard
- After completing games, navigate to Caregiver Dashboard
- See: Performance overview, Cognitive domain analytics, Trends

#### 6. View Trends
- Click "Trends" tab
- See accuracy over time with personal baseline
- See difficulty trajectory

#### 7. View Insights
- Click "Insights" tab
- See explainable insight cards with:
  - Evidence-based observations
  - Gemini-generated explanations
  - Prototype disclaimer

#### 8. Demonstrate Offline Mode
- In the demo page, click "Simulate Offline"
- Play a game — data saves locally
- Click "Simulate Sync" — data synchronizes

#### 9. View Methodology
- Navigate to /methodology
- See AI/ML vs Engineered breakdown

### Demo Users
| User | Pattern | Purpose |
|------|---------|---------|
| Rajesh Kumar | Stable performance | Normal baseline demo |
| Sunita Devi | Recent change in performance | Trend detection demo |
| Demo User | No history | New user experience |

### Key Demo Points
1. **Adaptive Difficulty**: Watch difficulty change after games
2. **Personal Baseline**: Compare current vs historical performance
3. **Trend Detection**: Sunita shows "recent change" pattern
4. **Explainability**: Every insight shows evidence + interpretation
5. **Offline-First**: Games work without internet
6. **No Medical Claims**: Every insight includes prototype disclaimer
