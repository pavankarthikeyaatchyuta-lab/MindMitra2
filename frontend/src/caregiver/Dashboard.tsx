import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, TrendingUp, Minus, AlertCircle, ArrowLeft, Users, Sparkles, Heart, Clock, ShieldCheck, Activity, ChevronRight, UserCheck, HelpCircle, Info, ChevronDown, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';
import ThemeToggle from '../components/ThemeToggle';
import { User, TrendData, GameSession, FamiliarPerson, OverallTrend } from '../types';

const TREND_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  stable: { color: 'text-emerald-800 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950/60', border: 'border-emerald-300 dark:border-emerald-800', icon: Minus, label: 'Stable' },
  improving: { color: 'text-blue-800 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-950/60', border: 'border-blue-300 dark:border-blue-800', icon: TrendingUp, label: 'Improving' },
  recent_change: { color: 'text-amber-900 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-950/60', border: 'border-amber-300 dark:border-amber-800', icon: TrendingDown, label: 'Recent Change' },
  variable: { color: 'text-purple-900 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-950/60', border: 'border-purple-300 dark:border-purple-800', icon: AlertCircle, label: 'Variable' },
  observation_available: { color: 'text-blue-900 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-950/60', border: 'border-blue-300 dark:border-blue-800', icon: Activity, label: 'Observation Available' },
  insufficient_history: { color: 'text-slate-800 dark:text-slate-300', bg: 'bg-slate-200 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-700', icon: Minus, label: 'Insufficient History' },
};

const REASON_LABELS: Record<string, string> = {
  accuracy_below_baseline: 'Accuracy was lower than personal baseline median',
  accuracy_improving: 'Accuracy is higher than personal baseline median',
  latency_above_baseline: 'Response latency increased by 20% or more',
  latency_stable: 'Response latency is steady and prompt',
  repeat_errors_increasing: 'Repeat error frequency increased during exercises',
  corrections_increasing: 'Self-corrections during recall increased',
  completion_time_increasing: 'Activity completion time increased',
  repeated_deviation: 'Observed across multiple consecutive eligible sessions',
  difficulty_changed: 'Difficulty level was adaptively adjusted',
  performance_at_higher_difficulty: 'Score reflects higher task complexity at increased level',
  performance_at_same_difficulty: 'Difficulty remained unchanged across observed sessions',
  performance_stable: 'Performance is well within normal baseline variance',
  performance_variable: 'Day-to-day score fluctuations within normal operational range',
  insufficient_history: 'Calibrating individual baseline across initial sessions',
  observation_available: 'Initial baseline formed; additional sessions will unlock longitudinal trends',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId?: string }>();
  const { caregiver, currentUser, switchProfile } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [overallTrend, setOverallTrend] = useState<OverallTrend | null>(null);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [familiarPeople, setFamiliarPeople] = useState<FamiliarPerson[]>([]);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const profiles = await api.getProfiles(false);
        setUsers(profiles);
        if (profileId) {
          const targetId = Number(profileId);
          setSelectedUserId(targetId);
          const found = profiles.find(p => p.id === targetId);
          if (found) switchProfile(found);
        } else if (currentUser) {
          setSelectedUserId(currentUser.id);
        } else if (profiles.length > 0) {
          setSelectedUserId(profiles[0].id);
          switchProfile(profiles[0]);
        }
      } catch (err) {
        console.log('Could not load profiles');
      }
    }
    init();
  }, [profileId]);

  useEffect(() => {
    if (!selectedUserId) return;
    async function loadData() {
      setLoading(true);
      try {
        const [t, gs, fp] = await Promise.all([
          api.getTrends(selectedUserId!),
          api.getUserGameSessions(selectedUserId!),
          api.getFamiliarPeople(selectedUserId!),
        ]);
        setTrends(t);
        setGameSessions(gs);
        setFamiliarPeople(fp);

        try {
          const data = await api.getOverallTrend(selectedUserId!);
          setOverallTrend(data);
        } catch {}
      } catch (err) {
        console.log('Could not load analytics');
      }
      setLoading(false);
    }
    loadData();
  }, [selectedUserId]);

    const handleStartSession = async () => {
    if (!selectedUserId) {
      navigate('/profiles');
      return;
    }
    setStartingSession(true);
    try {
      const res = await api.startSession(selectedUserId);
      sessionStorage.setItem('mindmitra_session_id', String(res.id));
      sessionStorage.setItem('mindmitra_current_profile_id', String(selectedUserId));
      navigate('/session');
    } catch {
      sessionStorage.setItem('mindmitra_session_id', String(Date.now()));
      navigate('/session');
    } finally {
      setStartingSession(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  const chartData = gameSessions
    .filter(gs => gs.accuracy != null)
    .slice(-20)
    .map((gs, i) => ({
      session: i + 1,
      accuracy: Math.round((gs.accuracy || 0) * 100),
      game: gs.game_type,
      difficulty: gs.difficulty,
    }));

  const validSessions = gameSessions.filter(gs => gs.accuracy != null);
  const avgAccuracy = validSessions.length > 0
    ? Math.round((validSessions.reduce((sum, gs) => sum + (gs.accuracy || 0), 0) / validSessions.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Top Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/profiles')}
            className="text-slate-900 dark:text-slate-200 hover:text-black dark:hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            title="Back to Profiles"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Activity size={18} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white">Caregiver Dashboard</h1>
              <p className="text-[11px] text-slate-700 dark:text-slate-400 font-bold">Longitudinal Behavioral Trend & Baseline Analysis</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {users.length > 0 && (
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-700 dark:text-blue-400" />
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    navigate('/profiles');
                  } else {
                    const newId = Number(e.target.value);
                    setSelectedUserId(newId);
                    const user = users.find(u => u.id === newId);
                    if (user) switchProfile(user);
                  }
                }}
                className="p-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.name} (Age {u.age})
                  </option>
                ))}
                <option value="new">+ Add Elderly Profile</option>
              </select>
            </div>
          )}

          <ThemeToggle />
          <CaregiverAccountMenu />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Responsive Navigation Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs sm:text-sm font-bold">
          <Link to="/caregiver" className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
            Overview
          </Link>
          <Link to="/office-kit" className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 font-bold">
            <span>💻 Office Kit</span>
          </Link>
          <Link to="/personal-pattern" className="px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 transition-all flex items-center gap-1.5 font-bold">
            <span>📱 Phone Companion</span>
          </Link>
          <Link to="/session" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 font-bold">
            <Sparkles size={14} className="text-amber-500" />
            <span>Today's Session</span>
          </Link>
          <Link to="/community" className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 font-bold">
            <Users size={14} />
            <span>Community Mode</span>
          </Link>
          <Link to="/connect" className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 font-bold">
            <Heart size={14} />
            <span>Connect Mode</span>
          </Link>
          <Link to="/caregiver/trends" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Trends & Adaptive AI
          </Link>
          <Link to="/caregiver/insights" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Explainable Insights
          </Link>
          <Link to="/caregiver/people" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Familiar People
          </Link>
          <Link to="/caregiver/reminders" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Reminders
          </Link>
          <Link to="/caregiver/history" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Session History
          </Link>
        </div>

        {/* Account-Level Profiles Hub: "Who are you caring for?" (Theme Consistent) */}
        {users.length > 1 && (
          <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 text-slate-900 dark:text-white shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                  Caregiver Hub: Who are you caring for?
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-bold mt-0.5">
                  {users.length} Active Elderly Profiles under {caregiver?.name || 'Caregiver'}
                </p>
              </div>
              <button
                onClick={() => navigate('/profiles')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-sm"
              >
                <span>+ Add Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {users.map((u) => {
                const isSelected = u.id === selectedUserId;
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      switchProfile(u);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-950/70 border-indigo-400 text-indigo-950 dark:text-white ring-2 ring-indigo-500'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                        {(u.display_name || u.name || 'U').charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{u.display_name || u.name}</h4>
                        <span className="text-[10px] text-slate-700 dark:text-indigo-200 font-bold block">Age {u.age}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* User Card */}
        {selectedUser && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl font-black text-white shadow-xs">
                {(selectedUser.name || selectedUser.display_name || '👤').charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedUser.name || selectedUser.display_name}</h2>
                <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold">
                  Age {selectedUser.age} • Language: {(selectedUser.preferred_language || 'EN').toUpperCase()} • Voice: {selectedUser.voice_enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 font-black">
                {gameSessions.length} Recorded Sessions
              </span>
              <button
                onClick={handleStartSession}
                disabled={startingSession}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Sparkles size={15} />
                <span>{startingSession ? "Preparing today's session..." : "Start Session"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Overall Behavioral Trend Banner */}
        {overallTrend && (
          <div className={`p-5 rounded-2xl border ${
            overallTrend.overall_status === 'recent_change'
              ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
              : overallTrend.overall_status === 'improving'
              ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-400 mb-1">
                  <Activity size={14} className="text-blue-700 dark:text-blue-400" /> Overall Behavioral Trend
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {overallTrend.headline}
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 font-bold">
                  {overallTrend.summary}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${
                  overallTrend.overall_status === 'recent_change'
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                    : overallTrend.overall_status === 'improving'
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                    : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                }`}>
                  {overallTrend.overall_status.toUpperCase().replace('_', ' ')}
                </span>
                <Link
                  to="/caregiver/trends"
                  className="text-xs text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Details</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Cognitive Domains Grid */}
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-3">Cognitive Domain Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trends.map((t) => {
              const cfg = TREND_CONFIG[t.trend] || TREND_CONFIG.insufficient_history;
              const Icon = cfg.icon;
              const isExpanded = expandedDomain === t.game_type;
              const count = t.sessions_analyzed ?? t.sessions_used ?? 0;

              return (
                <div
                  key={t.game_type}
                  className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all ${
                    t.trend === 'recent_change' ? 'border-amber-300 dark:border-amber-800' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-300">
                        {t.domain_name || t.game_type.replace('_', ' ')}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border flex items-center gap-1 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        <Icon size={12} />
                        <span>{t.trend_label || cfg.label}</span>
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {t.current_performance != null ? `${Math.round(t.current_performance * 100)}%` : '—'}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-400">
                        Baseline: {
                          t.baseline != null
                            ? `${Math.round(t.baseline * 100)}%`
                            : count === 0
                              ? 'Not Established'
                              : 'Calibrating'
                        }
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-300 leading-relaxed">
                      {t.trend_description || t.observation_note}
                    </div>

                    {t.reasons && t.reasons.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="text-[10px] font-black text-slate-900 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Contributing Factors:
                        </span>
                        <ul className="text-[11px] font-bold text-slate-800 dark:text-slate-300 space-y-1">
                          {t.reasons.map((r, ri) => (
                            <li key={ri} className="flex items-start gap-1.5">
                              <span className="text-blue-700 font-bold">•</span>
                              <span>{REASON_LABELS[r] || r.replace(/_/g, ' ')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-400">
                    <span>{count} eligible session{count === 1 ? '' : 's'}</span>
                    <Link
                      to="/caregiver/insights"
                      className="text-blue-700 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <span>Explain</span>
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Chart */}
        {chartData.length > 0 && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Accuracy Over Recent Sessions</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="session" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ fill: '#2563eb', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-center py-4 text-xs font-bold text-slate-700 dark:text-slate-400">
          ⚠️ MindMitra is a supportive cognitive companion and does NOT provide clinical diagnosis. Always consult a healthcare professional for clinical concerns.
        </div>
      </div>
    </div>
  );
}
