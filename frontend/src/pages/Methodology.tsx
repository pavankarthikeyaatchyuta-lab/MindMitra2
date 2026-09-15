import React from 'react';
import { BrainCircuit, Settings, ShieldCheck, Database, LayoutDashboard, ArrowLeft, Sparkles, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function Methodology() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6 md:p-12 pb-24 bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150 relative">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 text-center">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <ArrowLeft size={16} /> Back to Welcome
            </button>

            <ThemeToggle />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
            Architecture & AI Methodology
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Combining deterministic healthcare guardrails with adaptive machine learning and explainable AI.
          </p>
        </header>

        {/* 4 Cognitive Activities Mapping */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <span>4 Evidence-Informed Cognitive Activities</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl mb-1">🧠</div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">1. Memory Match</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Short-Term Memory</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Evaluates card pair retention, latency, and repeat mistake rates.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl mb-1">📋</div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">2. Daily Routine Recall</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Sequential Memory</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Memorize-and-recall sequence task measuring temporal ordering.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl mb-1">🔍</div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">3. Object & Person Rec</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Visual & Face Recognition</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Visual identification and caregiver-uploaded family photos.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl mb-1">✨</div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">4. Pattern Recall</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Pattern & Attention</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Geometric structure recognition with distractor sequences.</p>
            </div>
          </div>
        </div>

        {/* AI/ML vs Engineered Architecture */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* AI / Machine Learning Section */}
          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-5">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <BrainCircuit size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI & Machine Learning</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Adaptive Intelligence & Explainability</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Dynamic Adaptive ML (`model.pkl`)</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Supervised <strong>Random Forest Classifier</strong> trained on 5,000+ gameplay telemetry sessions with 90.1% prototype accuracy.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">3-Tier Natural Language Explainability</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Translates statistical deviations into understandable caregiver summaries via Google Gemini 2.0 Flash / Nemotron-3 Super.
                </p>
              </div>
            </div>
          </div>

          {/* Engineered Healthcare Systems */}
          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-5">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Settings size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Engineered Systems</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Baseline Engine & Reliability</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Rolling Personal Baseline Engine</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Calculates median performance across 5–10 recent sessions to establish an individual behavioral reference point.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Caregiver Multi-Profile Isolation</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Cryptographic PBKDF2 authentication, JWT tokens, and strict database foreign key cascading protect all elderly telemetry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
