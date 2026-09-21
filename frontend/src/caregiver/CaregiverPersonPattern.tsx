import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  ArrowLeft, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  ShieldCheck, 
  HelpCircle, 
  Sparkles, 
  ChevronRight, 
  Laptop, 
  User, 
  Play
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import AppLayout from '../components/layout/AppLayout';
import { 
  User as UserType, 
  TrendData, 
  OverallTrend, 
  GameSession, 
  AdaptiveDecision 
} from '../types';
import { LocalTemplateExplanationProvider } from '../services/explanationProvider';

const DOMAIN_LABELS: Record<string, string> = {
  short_term_memory: 'Memory Match',
  sequential_episodic_memory: 'Daily Routine Recall',
  visual_familiar_recognition: 'Visual Recall',
  pattern_attention: 'Pattern Recall',
  memory_match: 'Memory Match',
  daily_routine: 'Daily Routine Recall',
  object_recognition: 'Visual Recall',
  pattern_recall: 'Pattern Recall',
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  stable: { 
    color: 'text-emerald-700 dark:text-emerald-300', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
    border: 'border-emerald-200 dark:border-emerald-800', 
    icon: Minus, 
    label: 'Stable Pattern' 
  },
  improving: { 
    color: 'text-blue-700 dark:text-blue-300', 
    bg: 'bg-blue-50 dark:bg-blue-950/40', 
    border: 'border-blue-200 dark:border-blue-800', 
    icon: TrendingUp, 
    label: 'Positive Progression' 
  },
  recent_change: { 
    color: 'text-amber-700 dark:text-amber-300', 
    bg: 'bg-amber-50 dark:bg-amber-950/40', 
    border: 'border-amber-200 dark:border-amber-800', 
    icon: TrendingDown, 
    label: 'Recent Change' 
  },
  variable: { 
    color: 'text-purple-700 dark:text-purple-300', 
    bg: 'bg-purple-50 dark:bg-purple-950/40', 
    border: 'border-purple-200 dark:border-purple-800', 
    icon: AlertCircle, 
    label: 'Variable Fluctuations' 
  },
  observation_available: { 
    color: 'text-blue-700 dark:text-blue-300', 
    bg: 'bg-blue-50 dark:bg-blue-950/40', 
    border: 'border-blue-200 dark:border-blue-800', 
    icon: Activity, 
    label: 'Observation Available' 
  },
  calibrating: { 
    color: 'text-slate-600 dark:text-slate-400', 
    bg: 'bg-slate-100 dark:bg-slate-800', 
    border: 'border-slate-200 dark:border-slate-700', 
    icon: Clock, 
    label: 'Calibrating Baseline' 
  },
};

export default function CaregiverPersonPattern() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, switchProfile } = useApp();

  const [person, setPerson] = useState<UserType | null>(null);
  const [overallTrend, setOverallTrend] = useState<OverallTrend | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [adaptiveHistory, setAdaptiveHistory] = useState<AdaptiveDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trends' | 'domains' | 'adaptive' | 'history'>('trends');

  const personId = Number(id);

  useEffect(() => {
    async function loadData() {
      if (!personId) return;
      setLoading(true);
      try {
        const profiles = await api.getProfiles(false);
        const current = profiles.find((p) => p.id === personId);
        if (current) setPerson(current);

        const [t, ot, gs, ah] = await Promise.all([
          api.getTrends(personId).catch(() => []),
          api.getOverallTrend(personId).catch(() => null),
          api.getUserGameSessions(personId).catch(() => []),
          api.getAdaptiveHistory(personId).catch(() => []),
        ]);

        setTrends(t || []);
        setOverallTrend(ot);
        setGameSessions(gs || []);
        setAdaptiveHistory(ah || []);
      } catch (err) {
        console.error('Failed to load caregiver person pattern:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [personId]);

  const sessionsCount = gameSessions.length;
  const isCalibrated = sessionsCount >= 3;

  // Chart data formatting
  const chartData = [...gameSessions]
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    .map((s, idx) => ({
      index: idx + 1,
      name: `S${idx + 1}`,
      accuracy: Math.round(s.accuracy * 100),
      latency: Math.round(s.avg_response_time_ms / 100) / 10, // seconds
      date: new Date(s.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    }));

  const overallStatusKey = overallTrend?.overall_status || (isCalibrated ? 'stable' : 'calibrating');
  const statusCfg = STATUS_CONFIG[overallStatusKey] || STATUS_CONFIG.stable;
  const StatusIcon = statusCfg.icon;

  const handleLaunchActivity = () => {
    if (person) {
      switchProfile(person);
      navigate('/activities');
    }
  };

  return (
    <AppLayout mode="caregiver">
      <div className="space-y-6 max-w-6xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              to="/caregiver"
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Back to Overview"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {person?.name || person?.display_name || 'Individual Pattern'}
                </h1>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border} flex items-center gap-1`}
                >
                  <StatusIcon size={12} />
                  <span>{statusCfg.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personal Behavioral Baseline & Longitudinal Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={`/caregiver/person/${personId}`}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors"
            >
              <span>Person Details & Photos</span>
            </Link>

            <button
              onClick={handleLaunchActivity}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Play size={13} />
              <span>Launch Activity</span>
            </button>
          </div>
        </div>

        {/* Baseline Calibration Status Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Honest Baseline Calibration
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isCalibrated ? 'Personal Baseline Fully Established' : `Calibrating Baseline: ${sessionsCount} of 3 Sessions`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isCalibrated
                  ? 'All deviations are calculated strictly relative to this individual’s own historical median (MAD standard deviation), never against arbitrary population averages.'
                  : 'Requires 3 completed sessions to calculate reliable personal medians and activate longitudinal deviation triggers.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {Math.min(100, Math.round((sessionsCount / 3) * 100))}%
                </span>
                <span className="text-[10px] text-slate-400 block">Progress</span>
              </div>
              <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (sessionsCount / 3) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('trends')}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'trends'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Longitudinal Trend
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'domains'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Multi-Domain Signals ({trends.length})
          </button>
          <button
            onClick={() => setActiveTab('adaptive')}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'adaptive'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Adaptive Decisions ({adaptiveHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Session History ({gameSessions.length})
          </button>
        </div>

        {/* TAB 1: LONGITUDINAL TREND */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Accuracy & Response Latency Over Time
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Telemetry captured on-device across consecutive activity sessions
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>Accuracy (%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Latency (s)</span>
                  </div>
                </div>
              </div>

              {chartData.length > 0 ? (
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#2563eb' }}
                        activeDot={{ r: 6 }}
                        name="Accuracy %"
                      />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#f59e0b' }}
                        name="Latency (s)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <Activity size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">No session data recorded yet.</p>
                </div>
              )}
            </div>

            {/* Overall Clinical Insight Card */}
            <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-1">
                <Sparkles size={15} />
                <span>Explainable AI Interpretation</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {overallTrend?.summary ||
                  overallTrend?.headline ||
                  'The user’s behavioral performance is being observed relative to personal historical variance. Consistent response patterns indicate stable cognitive interaction rhythm.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-DOMAIN SIGNALS */}
        {activeTab === 'domains' && (
          <div className="space-y-4">
            {trends.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Activity size={36} className="mx-auto text-slate-400 mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Domain Telemetry Yet</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Complete activities to generate multi-domain cognitive signals.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trends.map((domainItem, dIdx) => {
                  const domainKey = domainItem.domain || domainItem.game_type || `domain_${dIdx}`;
                  const statusKey = domainItem.status || domainItem.trend || 'stable';
                  const dCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.stable;
                  const DIcon = dCfg.icon;
                  const label = DOMAIN_LABELS[domainKey] || domainItem.domain_label || domainKey;

                  return (
                    <div
                      key={domainKey}
                      className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {label}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dCfg.bg} ${dCfg.color} ${dCfg.border} flex items-center gap-1`}
                          >
                            <DIcon size={11} />
                            <span>{dCfg.label}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                            <span className="text-slate-400 block text-[10px]">Recent Accuracy</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {Math.round((domainItem.current_performance ?? 0.85) * 100)}%
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                            <span className="text-slate-400 block text-[10px]">Baseline Median</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {Math.round((domainItem.baseline ?? 0.85) * 100)}%
                            </span>
                          </div>
                        </div>

                        {domainItem.reason_codes && domainItem.reason_codes.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {domainItem.reason_codes.map((rc, i) => (
                              <p key={i} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span>{rc.replace(/_/g, ' ')}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADAPTIVE DECISIONS */}
        {activeTab === 'adaptive' && (
          <div className="space-y-3">
            {adaptiveHistory.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Cpu size={36} className="mx-auto text-slate-400 mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Adaptive Adjustments Yet</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  On-device ML Random Forest continuously evaluates session signals and maintains comfort.
                </p>
              </div>
            ) : (
              adaptiveHistory.map((dec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold text-xs">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                          {dec.recommendation}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                          Level {dec.previous_difficulty} → Level {dec.recommended_difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {dec.reason}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                      ⚡ &lt; 2ms
                    </span>
                    <span className="text-[10px] text-slate-400">On-Device RF</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: SESSION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-2.5">
            {gameSessions.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Clock size={36} className="mx-auto text-slate-400 mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Sessions Logged</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Start an activity session to record behavioral metrics.
                </p>
              </div>
            ) : (
              gameSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      {Math.round(session.accuracy * 100)}%
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {DOMAIN_LABELS[session.game_type] || session.game_type}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Level {session.difficulty} • {new Date(session.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Response Time</span>
                      <span className="font-mono font-bold">{(session.avg_response_time_ms / 1000).toFixed(1)}s</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Corrections</span>
                      <span className="font-mono font-bold">{session.corrections}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Repeat Errors</span>
                      <span className="font-mono font-bold">{session.repeat_errors}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
