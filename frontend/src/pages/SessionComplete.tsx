import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Activity, Home, ArrowRight, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function SessionComplete() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="card p-8 sm:p-12 max-w-xl w-full text-center relative shadow-xl border-emerald-200 dark:border-emerald-800">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-5 text-emerald-600 dark:text-emerald-400">
          <Sparkles size={32} />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
          Great work today!
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-md mx-auto">
          You've completed all 4 cognitive activities for today. Routine engagement is a wonderful daily habit.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="elderly-btn-secondary text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2"
          >
            <Home size={18} /> Return Home
          </button>

          <button
            onClick={() => navigate('/caregiver')}
            className="elderly-btn-primary text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2"
          >
            <Activity size={18} /> View Caregiver Report <ArrowRight size={18} />
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck size={14} className="text-blue-500" />
          Prototype behavioral insight — not a medical diagnosis.
        </div>
      </div>
    </div>
  );
}
