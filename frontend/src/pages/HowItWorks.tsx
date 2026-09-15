import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Brain, 
  ArrowLeft, 
  ArrowRight, 
  Cpu, 
  TrendingUp, 
  HeartHandshake, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Users, 
  Activity, 
  Layers, 
  Clock 
} from 'lucide-react';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';
import ThemeToggle from '../components/ThemeToggle';
import { useApp } from '../context/AppContext';

export default function HowItWorks() {
  const navigate = useNavigate();
  const { caregiver } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              title="Back to Home"
            >
              <ArrowLeft size={18} />
            </button>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Brain size={18} />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">MindMitra</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {caregiver ? (
              <CaregiverAccountMenu />
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all"
              >
                Caregiver Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-grow">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Layers size={13} className="text-blue-600 dark:text-blue-400" />
            <span>Product Architecture & Cognitive Science</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How MindMitra Works
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
            A comprehensive overview of MindMitra's cognitive activities, machine-learning adaptive engine, longitudinal trend math, and explainable AI insights.
          </p>
        </div>

        {/* Step 1: Cognitive Exercises */}
        <section className="mb-8 card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Engaging, Dignified Cognitive Exercises</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
            Four activities target specific cognitive domains without causing anxiety:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <strong className="text-slate-900 dark:text-white text-sm block mb-1">1. Memory Match</strong>
              <span className="text-blue-600 dark:text-blue-400 font-semibold block mb-1.5">Short-Term Memory</span>
              <p className="text-slate-600 dark:text-slate-400">Card-matching exercise assessing working memory latency, card flip frequency, and repeat error counts.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <strong className="text-slate-900 dark:text-white text-sm block mb-1">2. Daily Routine Recall</strong>
              <span className="text-blue-600 dark:text-blue-400 font-semibold block mb-1.5">Sequential & Episodic Memory</span>
              <p className="text-slate-600 dark:text-slate-400">Chronological re-ordering of everyday tasks (morning tea, medication, walking, dinner) evaluating logical procedural memory.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <strong className="text-slate-900 dark:text-white text-sm block mb-1">3. Object & Face Recognition</strong>
              <span className="text-blue-600 dark:text-blue-400 font-semibold block mb-1.5">Visual & Semantic Recognition</span>
              <p className="text-slate-600 dark:text-slate-400">Distinguishing household objects and recognizing caregiver-uploaded family member photos with verified consent.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <strong className="text-slate-900 dark:text-white text-sm block mb-1">4. Pattern Recall</strong>
              <span className="text-blue-600 dark:text-blue-400 font-semibold block mb-1.5">Pattern Attention & Recall</span>
              <p className="text-slate-600 dark:text-slate-400">Memorizing and identifying geometric symbol sequences to measure sustained focus and spatial working memory.</p>
            </div>
          </div>
        </section>

        {/* Step 2: Machine Learning Adaptive Engine */}
        <section className="mb-8 card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Real-Time Machine Learning Difficulty Engine</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
            MindMitra uses a trained supervised <strong>Random Forest Classifier</strong> (`ml/model.pkl`) to adapt task difficulty (Level 1–5) based on gameplay telemetry.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300">
            Features Analyzed: Accuracy • Response Latency (ms) • Response Time Variance • Repeat Error Rate • Self-Correction Rate • Completion Duration
          </div>
        </section>

        {/* Step 3: Longitudinal Baseline Engine */}
        <section className="mb-8 card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Baseline & Longitudinal Trend Engine</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
            Rather than comparing seniors against arbitrary population averages, MindMitra calculates a <strong>rolling personal median baseline</strong> from the user's last 5–10 valid sessions.
          </p>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Stable:</strong> Performance conforms to the established personal baseline range.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <span><strong>Improving:</strong> Accuracy or speed consistently exceeds the historical median.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <span><strong>Recent Change:</strong> Significant deviation (&gt;15–20%) detected across consecutive sessions.</span>
            </li>
          </ul>
        </section>

        {/* Step 4: Explainability & Medical Guardrails */}
        <section className="mb-8 card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              04
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">3-Tier Explainable AI & Non-Diagnostic Guardrails</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
            Caregiver summaries are generated using a 3-tier cascade (Tier 1: Google Gemini 2.0 Flash ➔ Tier 2: Nemotron-3 Super ➔ Tier 3: Deterministic Rule-Based Engine).
          </p>
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Medical Disclaimer:</strong> MindMitra is strictly an assistive cognitive wellness companion and does NOT provide clinical diagnoses.
            </span>
          </div>
        </section>

        {/* Call to Action */}
        <div className="text-center pt-4">
          <button
            onClick={() => navigate('/login')}
            className="elderly-btn-primary text-base py-3.5 px-8 rounded-xl inline-flex items-center gap-2 shadow-sm"
          >
            <span>Get Started with MindMitra</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </main>
    </div>
  );
}
