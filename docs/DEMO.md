# MindMitra iQOO Demo Guide

## Quick Demo Paths for Hackathon Judges

### Path 1: Instant Judge Scenario Demo (Recommended for Fast Evaluation)
- **URL**: `http://localhost:3000/judge-demo`
- **What it does**: Allows judges to trigger real, deterministic gameplay scenarios through the actual on-device Random Forest model and personal baseline engine:
  - **Scenario A (Normal Cadence)**: Latency 950ms, 0 errors $\rightarrow$ Model predicts `INCREASE`/`MAINTAIN`, Baseline: `NORMAL`.
  - **Scenario B (Fatigued / Hesitation Cadence)**: Latency 3800ms, 4 repeat errors $\rightarrow$ Model predicts `DECREASE`, Baseline: `MEANINGFUL_DEVIATION`.
- **Telemetry Breakdown**: Displays the exact 9-feature normalized vector and tree traversal time in real time.

---

### Path 2: Real Dual-Device Cross-Sync Demo (Phone $\leftrightarrow$ Laptop)

1. **Start the servers** (bound to `0.0.0.0`):
   ```bash
   # Terminal 1: Backend
   cd backend
   python -m uvicorn main:app --host 0.0.0.0 --port 8000

   # Terminal 2: Frontend
   cd frontend
   npm run dev -- --host 0.0.0.0 --port 3000
   ```

2. **Open on Laptop**:
   - Navigate to: `http://localhost:3000/office-kit`
   - This opens the caregiver's live Office Kit monitoring dashboard.

3. **Open on Phone (iQOO / Android on same Wi-Fi)**:
   - Check local LAN IP (e.g. `10.80.99.78`)
   - Navigate to: `http://<YOUR_LAN_IP>:3000/personal-pattern`
   - Play the touch activity or tap the simulation button.

4. **Observe Zero-Refresh Update**:
   - Within **~133 ms**, the laptop dashboard updates with the elderly person's deviation status, recommended pacing adjustments, and reason codes without refreshing the page!

---

### Path 3: Airplane Mode Core Loop Verification (100% Offline)

1. Open `http://localhost:3000/personal-pattern` in mobile browser mode or physical phone.
2. Enable **Airplane Mode** (or DevTools Network Offline).
3. Tap through the sequence cards.
4. Verify that:
   - Telemetry captures cadence and repeat error taps.
   - On-device ML executes locally in `< 0.001 ms` with **zero network requests**.
   - Personal baseline calculates deviation status against local profile history.
   - Next activity adapts immediately.

---

### Path 4: Automated Verification Test Suite

Run the full end-to-end verification script to reproduce all empirical benchmarks:
```bash
# 1. Run Mobile E2E Puppeteer Audit (10-Point Checklist)
node frontend/scripts/test_iqoo_e2e_audit.mjs

# 2. Run Backend Mathematical Parity & Profile Isolation Tests
python -m pytest backend/test_iqoo_validation_suite.py -v
```
All empirical evidence, latencies, and verification artifacts are saved to `audit_evidence/` and documented in `docs/IQOO_VALIDATION_REPORT.md`.

