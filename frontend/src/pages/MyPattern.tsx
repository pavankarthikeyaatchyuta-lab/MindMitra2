import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Brain, 
  Sparkles, 
  Volume2, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  History, 
  Cpu, 
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import AppLayout from '../components/layout/AppLayout';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PersonalBaselineEngine, SessionEvidenceVector } from '../services/personalBaselineEngine';
import { PersonalMemoryDB } from '../services/personalMemoryDB';
import { InstructionService } from '../services/instructionService';
import { VoiceService } from '../services/voiceService';
import { useTranslation } from '../i18n';

export default function MyPattern() {
  const navigate = useNavigate();
  const { currentUser, switchProfile } = useApp();
  const { language } = useTranslation();

  const [history, setHistory] = useState<SessionEvidenceVector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [adaptiveHistory, setAdaptiveHistory] = useState<any[]>([]);

  useEffect(() => {
    async function loadPatternData() {
      setLoading(true);
      if (currentUser) {
        // 1. Load local baseline history
        const localList = PersonalBaselineEngine.getSessionHistory(currentUser.id, 'overall');
        let combined: SessionEvidenceVector[] = [...localList];

        try {
          const dbList = await PersonalMemoryDB.getSessionHistory(currentUser.id, 'overall');
          const map = new Map<string, SessionEvidenceVector>();
          localList.forEach(s => map.set(s.timestamp + '_' + s.accuracy, s));
          dbList.forEach(s => map.set(s.timestamp + '_' + s.accuracy, {
            accuracy: s.accuracy,
            mean_response_time_ms: s.mean_response_time_ms,
            corrections: s.corrections,
            repeat_errors: s.repeat_errors,
            completion_time_ms: s.completion_time_ms,
            difficulty: s.difficulty,
            timestamp: s.timestamp,
          }));

          // Pull backend game sessions
          const backendGames = await api.getUserGameSessions(currentUser.id);
          if (backendGames && backendGames.length > 0) {
            backendGames.forEach(bg => {
              const key = (bg.completed_at || bg.started_at) + '_' + (bg.accuracy || 0);
              if (!map.has(key)) {
                map.set(key, {
                  accuracy: bg.accuracy || 0.8,
                  mean_response_time_ms: bg.avg_response_time_ms || 2000,
                  corrections: bg.corrections || 0,
                  repeat_errors: bg.repeat_errors || 0,
                  completion_time_ms: bg.completion_time_ms || 25000,
                  difficulty: bg.difficulty || 2,
                  timestamp: bg.completed_at || bg.started_at,
                });
              }
            });
          }

          combined = Array.from(map.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        } catch {}

        setHistory(combined);

        // 2. Load adaptive recommendations
        try {
          const adRes = await api.getAdaptiveHistory(currentUser.id);
          setAdaptiveHistory(adRes || []);
        } catch {}
      }
      setLoading(false);
    }
    loadPatternData();
  }, [currentUser]);

  const sessionCount = history.length;
  const isCalibrating = sessionCount < 3;

  const medianAcc = sessionCount > 0 ? PersonalBaselineEngine.calculateMedian(history.map(s => s.accuracy)) : 0.85;
  const medianLat = sessionCount > 0 ? PersonalBaselineEngine.calculateMedian(history.map(s => s.mean_response_time_ms)) : 2000;
  const medianCorr = sessionCount > 0 ? PersonalBaselineEngine.calculateMedian(history.map(s => s.corrections)) : 1;

  const latest = sessionCount > 0 ? history[sessionCount - 1] : null;
  const currentBaseline = latest && currentUser
    ? PersonalBaselineEngine.evaluateAgainstBaseline(currentUser.id, latest, 'overall')
    : null;

  const currentStatus = isCalibrating ? 'CALIBRATING' : (currentBaseline?.status || 'NORMAL');

  // Chart data
  const chartData = history.map((s, idx) => ({
    session: `S${idx + 1}`,
    accuracy: Math.round(s.accuracy * 100),
    latency: Number((s.mean_response_time_ms / 1000).toFixed(1)),
    level: s.difficulty,
  }));

  const handleSpeakSummary = () => {
    const summary = InstructionService.getPersonalPatternSummary(currentStatus, language, sessionCount);
    VoiceService.speak(summary, language, true);
  };

  return (
    <AppLayout mode="user">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-3.5 sm:gap-5 animate-in fade-in">
        {/* Header with Spoken Audio Trigger */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase font-black tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
              Personal Behavioral Memory
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              My Personal Pattern
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              "Your phone learns what normal looks like for you."
            </p>
          </div>

          <button
            onClick={handleSpeakSummary}
            className="touch-target-48 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors shrink-0 cursor-pointer"
            title="Listen to summary"
            aria-label="Listen to personal pattern summary"
          >
            <Volume2 size={16} />
            <span className="hidden sm:inline">Listen</span>
          </button>
        </div>

        {/* 1. BASELINE STATUS & CALIBRATION CARD */}
        <div className="card p-4 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            {isCalibrating ? (
              <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Building Baseline ({sessionCount} of 3 sessions)
              </span>
            ) : currentStatus === 'MEANINGFUL_DEVIATION' ? (
              <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5">
                <TrendingDown size={14} />
                Meaningful Variation from Baseline
              </span>
            ) : (
              <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Pattern Steady & Consistent
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white max-w-md mx-auto mb-3 sm:mb-4 leading-relaxed">
            {isCalibrating
              ? 'Your phone is observing your natural response speed and touch cadence to learn your baseline range.'
              : 'Your recent interactions remain comfortably aligned with your established personal pattern.'}
          </p>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-1">
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>Baseline Calibration Progress</span>
              <span className="text-blue-600 dark:text-blue-400 font-black">
                {Math.min(100, Math.round((sessionCount / 3) * 100))}%
              </span>
            </div>
            <div className="w-full h-2.5 sm:h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(sessionCount > 0 ? 33 : 10, (sessionCount / 3) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. BEHAVIORAL METRICS GRID (Compact on Mobile) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="card p-2.5 sm:p-4 text-center border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-0.5 sm:mb-1 truncate">
              Typical Accuracy
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {sessionCount > 0 ? `${Math.round(medianAcc * 100)}%` : '--'}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Median</span>
          </div>

          <div className="card p-2.5 sm:p-4 text-center border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-0.5 sm:mb-1 truncate">
              Tap Latency
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400">
              {sessionCount > 0 ? `${(medianLat / 1000).toFixed(1)}s` : '--'}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Speed</span>
          </div>

          <div className="card p-2.5 sm:p-4 text-center border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-0.5 sm:mb-1 truncate">
              Corrections
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-purple-600 dark:text-purple-400">
              {sessionCount > 0 ? medianCorr : '--'}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Per Activity</span>
          </div>
        </div>

        {/* 3. LONGITUDINAL TREND CHART (Responsive) */}
        <div className="card p-3.5 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Longitudinal Accuracy Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tracking session accuracy consistency over time
              </p>
            </div>
            <span className="text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
              {history.length} Sessions
            </span>
          </div>

          {chartData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="session" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-card)',
                      borderRadius: '0.75rem',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    name="Accuracy" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#2563eb' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">
              No sessions recorded yet. Play an activity to begin tracking your pattern.
            </div>
          )}
        </div>

        {/* 4. RECENT SESSIONS — Card-based on Phone, Table-based on Desktop */}
        <div className="card p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Recent Activity Sessions
              </h3>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No activity sessions yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {history.slice(-5).reverse().map((sess, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                      #{history.length - idx}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Level {sess.difficulty} Activity
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(sess.timestamp).toLocaleDateString()} at {new Date(sess.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                      {Math.round(sess.accuracy * 100)}%
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {(sess.mean_response_time_ms / 1000).toFixed(1)}s latency
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. ADAPTIVE DECISIONS HISTORY */}
        {adaptiveHistory.length > 0 && (
          <div className="card p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
              Adaptive Level Adjustments
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              On-device machine learning tuning difficulty to support comfortable play
            </p>

            <div className="flex flex-col gap-2">
              {adaptiveHistory.slice(-3).reverse().map((ad, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize block">
                      {ad.game_type?.replace('_', ' ') || 'Activity'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Level {ad.previous_difficulty} → Level {ad.recommended_difficulty}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                    ad.recommendation === 'INCREASE'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : ad.recommendation === 'DECREASE'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {ad.recommendation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. PRIVACY & NON-DIAGNOSTIC GUARANTEE */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3">
          <ShieldCheck size={20} className="text-blue-500 shrink-0" />
          <span>
            MindMitra records behavioral patterns for comfort and cognitive wellness. This is non-diagnostic and processed 100% locally.
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
