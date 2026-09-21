import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Activity, 
  Brain, 
  Sparkles, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck,
  Volume2,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PersonalBaselineEngine } from '../services/personalBaselineEngine';
import { InstructionService } from '../services/instructionService';
import { VoiceService } from '../services/voiceService';
import { useTranslation } from '../i18n';

export default function UserHome() {
  const navigate = useNavigate();
  const { currentUser, switchProfile } = useApp();
  const { language } = useTranslation();

  const [sessionCount, setSessionCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [todaysActivity, setTodaysActivity] = useState({
    id: 'memory',
    title: 'Memory Match',
    description: 'Find matching everyday pairs at your personal pace.',
    icon: '🧩',
    duration: '2-3 min'
  });

  useEffect(() => {
    async function loadUserState() {
      setLoading(true);
      try {
        let active = currentUser;
        if (!active) {
          const profiles = await api.getProfiles(false);
          if (profiles && profiles.length > 0) {
            active = profiles[0];
            switchProfile(active);
          }
        }

        if (active) {
          // Check session count from unified backend + local
          try {
            const countRes = await api.getCanonicalSessionCount(active.id);
            if (countRes && countRes.session_count !== undefined) {
              setSessionCount(countRes.session_count);
            } else {
              const localHistory = PersonalBaselineEngine.getSessionHistory(active.id, 'overall');
              setSessionCount(localHistory.length);
            }
          } catch {
            const localHistory = PersonalBaselineEngine.getSessionHistory(active.id, 'overall');
            setSessionCount(localHistory.length);
          }
        }
      } catch (e) {
        console.warn('Could not load user profile in UserHome:', e);
      }
      setLoading(false);
    }
    loadUserState();
  }, [currentUser]);

  const userName = currentUser?.name || currentUser?.display_name || 'Friend';
  const isCalibrating = sessionCount < 3;

  const handleStartToday = () => {
    navigate(`/activity/${todaysActivity.id}`);
  };

  const handleSpeakStatus = () => {
    const text = isCalibrating
      ? `Good day ${userName}. We are currently building your personal pattern. ${sessionCount} of 3 initial sessions are recorded.`
      : `Good day ${userName}. Your personal pattern is active and steady. Start your daily activity whenever you are ready.`;
    VoiceService.speak(text, language, true);
  };

  return (
    <AppLayout mode="user">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-3.5 sm:gap-5 animate-in fade-in">
        {/* 1. WHO AM I? — Respectful, Compact Identity Card */}
        <section className="card p-4 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] uppercase font-extrabold tracking-wider text-blue-600 dark:text-blue-400">
                Daily Welcome
              </span>
              <button
                onClick={handleSpeakStatus}
                className="p-1 rounded-full text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                title="Listen to welcome"
                aria-label="Listen to welcome message"
              >
                <Volume2 size={15} />
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Good day, {userName}.
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
              Your phone learns what normal interaction looks like for you.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
              Age {currentUser?.age || 70}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold uppercase">
              {currentUser?.preferred_language || 'EN'}
            </span>
          </div>
        </section>

        {/* 2. WHAT SHOULD I DO TODAY? — Fast, High-Affordance Activity CTA */}
        <section className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/15 flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-300" />
              Today's Recommended Activity
            </span>
            <span className="text-xs text-blue-100 font-bold px-2.5 py-0.5 rounded-full bg-white/15">
              {todaysActivity.duration}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl sm:text-3xl shrink-0">
              {todaysActivity.icon}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
                {todaysActivity.title}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5 font-medium leading-normal">
                {todaysActivity.description}
              </p>
            </div>
          </div>

          <button
            onClick={handleStartToday}
            className="mt-1 w-full touch-target-48 py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white text-blue-900 hover:bg-blue-50 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer"
          >
            <Play size={18} className="fill-blue-900" />
            <span>Start Activity</span>
          </button>
        </section>

        {/* 3. WHAT IS MY CURRENT PATTERN STATUS? — Honest, Non-Diagnostic Metric */}
        <section className="card p-4 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={17} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Personal Behavioral Pattern
              </h3>
            </div>
            <Link
              to="/my-pattern"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <span>View Details</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Status Banner */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isCalibrating ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                )}
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {isCalibrating ? 'Building Your Baseline' : 'Pattern Active & Steady'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {isCalibrating
                  ? `${sessionCount} of 3 sessions recorded. Play today to advance your calibration.`
                  : 'Your interaction rhythm is currently aligned with your established normal range.'}
              </p>
            </div>

            <Link
              to="/my-pattern"
              className="elderly-btn-secondary text-xs sm:text-sm py-2 px-3.5 rounded-xl shrink-0 self-start sm:self-auto text-center"
            >
              View My Pattern
            </Link>
          </div>

          {/* Calibration Progress Bar */}
          <div className="mt-0.5">
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>Calibration Progress</span>
              <span className="text-blue-600 dark:text-blue-400 font-black">
                {Math.min(100, Math.round((sessionCount / 3) * 100))}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(sessionCount > 0 ? 33 : 8, (sessionCount / 3) * 100))}%` }}
              />
            </div>
          </div>
        </section>

        {/* 4. QUICK EXPLORE ACTIVITIES LINK */}
        <section className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
              🧩
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                All Available Activities
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                Memory Match, Daily Routine Recall, Visual Recall, Pattern Recall
              </p>
            </div>
          </div>

          <Link
            to="/activities"
            className="touch-target-48 p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center justify-center shrink-0"
            title="Browse all activities"
            aria-label="Browse all activities"
          >
            <ArrowRight size={18} />
          </Link>
        </section>
      </div>
    </AppLayout>
  );
}
