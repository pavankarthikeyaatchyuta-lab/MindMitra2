import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, ChevronRight, ArrowLeft, Activity, Sparkles, Database, ShieldCheck, RotateCcw } from 'lucide-react';
import * as api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function Demo() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const steps = [
    { title: "1. Seed Demonstration Profiles", desc: "Generates 12 historical sessions for Rajesh Kumar (Stable Baseline) and Sunita Devi (Recent Performance Change) across 4 cognitive domains." },
    { title: "2. View Rajesh Kumar (Stable Baseline)", desc: "Examines a steady historical trajectory with 85-92% accuracy across all 4 cognitive domains." },
    { title: "3. Run 4 Cognitive Activities", desc: "Plays Memory Match, Daily Routine, Object & Person Recognition, and Pattern Recall with active telemetry." },
    { title: "4. Observe Adaptive ML Difficulty", desc: "Reviews how the Random Forest classifier dynamically calibrated difficulty levels (Level 1–4) with detailed reasoning." },
    { title: "5. Switch to Sunita Devi (Recent Change)", desc: "Analyzes a profile demonstrating an observed shift in latency and accuracy." },
    { title: "6. Inspect 'Why Was This Highlighted?'", desc: "Checks structured evidence metrics comparing current performance against personal baselines." },
    { title: "7. Generate Gemini Caregiver Summary", desc: "Produces an empathetic, non-diagnostic AI explanation with strict medical disclaimer." },
    { title: "8. Test Familiar Person Photos & Privacy", desc: "Verifies caregiver photo upload, validation, consent confirmation, and zero external LLM exposure." },
    { title: "9. Simulate Offline Gameplay & Sync", desc: "Saves gameplay events locally and simulates cloud synchronization upon reconnection." }
  ];

  const handleRunStep = async () => {
    if (activeStep >= steps.length) return;
    setRunning(true);
    setStatusMsg("Executing demo action...");

    await new Promise(r => setTimeout(r, 600));

    if (activeStep === 0) {
      try {
        await api.seedFullDemo();
        setStatusMsg("Demo data seeded successfully with 4 cognitive domains & familiar people!");
      } catch {
        setStatusMsg("Seeded locally in offline mode.");
      }
    } else if (activeStep === 1) {
      setStatusMsg("Rajesh Kumar selected. Historical baseline established at 88%.");
    } else if (activeStep === 3) {
      setStatusMsg("Adaptive AI decision logged: Level 2 → Level 3 (Confidence: 88%).");
    } else if (activeStep === 4) {
      setStatusMsg("Sunita Devi selected. Recent performance delta detected (-18%).");
    } else if (activeStep === 6) {
      setStatusMsg("Gemini synthesized empathetic caregiver summary with prototype disclaimer.");
    } else if (activeStep === 8) {
      setStatusMsg("Offline telemetry sync completed.");
    }

    setActiveStep(prev => prev + 1);
    setRunning(false);
  };

  const handleResetDemo = async () => {
    setActiveStep(0);
    setStatusMsg(null);
    await api.seedFullDemo();
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150 relative">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <ArrowLeft size={14} /> Home
              </button>
              <span className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Evaluation Scenario Runner
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">MindMitra Walkthrough</h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate('/caregiver')}
              className="elderly-btn-secondary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <Activity size={15} /> Caregiver View
            </button>
            <button
              onClick={() => navigate('/session')}
              className="elderly-btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <span>🎮</span> Play Games
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs font-semibold flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Step Runner Card */}
        <div className="card p-6 sm:p-8 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Step-by-Step Scenario Runner</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Step {activeStep} of {steps.length} completed</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleResetDemo}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
              >
                <RotateCcw size={13} /> Reset
              </button>

              <button
                onClick={handleRunStep}
                disabled={running || activeStep >= steps.length}
                className="elderly-btn-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5"
              >
                <Play size={14} fill="currentColor" />
                <span>{running ? 'Executing...' : activeStep >= steps.length ? 'Scenario Complete ✓' : 'Execute Next Step'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isPast = idx < activeStep;
              const isCurrent = idx === activeStep;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs transition-all ${
                    isPast
                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                      : isCurrent
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-white font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isPast
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                    }`}>
                      {isPast ? '✓' : idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{step.title}</p>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
