import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, CheckCircle2, ChevronRight, Activity, Users, Brain, Play, Sparkles, X, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';
import ThemeToggle from '../components/ThemeToggle';
import { User, Session, GameSession } from '../types';

export default function History() {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId?: string }>();
  const { currentUser, switchProfile, setCurrentSession } = useApp();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<{ session: Session; games: GameSession[] } | null>(null);
  const [loading, setLoading] = useState(true);

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
      } catch {}
    }
    init();
  }, [profileId, currentUser]);

  useEffect(() => {
    if (!selectedUserId) return;
    loadHistory();
  }, [selectedUserId]);

  const loadHistory = async () => {
    setLoading(true);
    setSessions([]);
    setGameSessions([]);
    try {
      const [sList, gList] = await Promise.all([
        api.getUserSessions(selectedUserId!),
        api.getUserGameSessions(selectedUserId!),
      ]);
      const sorted = (sList || []).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      setSessions(sorted);
      setGameSessions(gList || []);
    } catch {
      console.log('Error loading history');
    }
    setLoading(false);
  };

  const handleOpenDetail = (session: Session) => {
    const matchingGames = gameSessions.filter(g => g.session_id === session.id);
    setSelectedSessionDetail({ session, games: matchingGames });
  };

  const handleResumeSession = (session: Session, games: GameSession[]) => {
    // Save existing session_id to sessionStorage and context to resume without duplicating
    sessionStorage.setItem('mindmitra_session_id', String(session.id));
    
    // Map completed game types
    const completedKeys = games
      .filter(g => g.completed_at != null || g.accuracy != null)
      .map(g => {
        const type = (g.game_type || '').toLowerCase();
        if (type.includes('memory')) return 'memory';
        if (type.includes('routine')) return 'routine';
        if (type.includes('recognition')) return 'recognition';
        if (type.includes('pattern')) return 'pattern';
        return g.game_type;
      });

    sessionStorage.setItem('mindmitra_completed_games', JSON.stringify(completedKeys));
    completedKeys.forEach(k => sessionStorage.setItem(`mindmitra_game_done_${k}`, 'true'));
    
    setCurrentSession(session);
    navigate('/session');
  };

  const getGameLabel = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('memory')) return 'Memory Match (Short-Term Memory)';
    if (t.includes('routine')) return 'Daily Routine Recall (Sequential Memory)';
    if (t.includes('recognition')) return 'Object & Face Recognition (Visual)';
    if (t.includes('pattern')) return 'Pattern Recall (Attention)';
    return type;
  };

  const completedCount = sessions.filter(s => s.status === 'completed' || s.status === 'Completed').length;
  const inProgressCount = sessions.filter(s => s.status === 'active' || s.status === 'in_progress' || (!['completed', 'Completed', 'abandoned'].includes(s.status))).length;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Top Navbar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-300 dark:border-slate-800 px-6 py-3.5 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/caregiver')}
            className="text-slate-900 dark:text-slate-300 hover:text-black dark:hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            title="Back to Overview"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">Session History</h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">Complete timeline of cognitive session records</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {users.length > 0 && (
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600 dark:text-blue-400" />
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setSessions([]);
                  setGameSessions([]);
                  setSelectedUserId(newId);
                  const u = users.find(user => user.id === newId);
                  if (u) switchProfile(u);
                }}
                className="p-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.display_name || u.name}</option>
                ))}
              </select>
            </div>
          )}

          <ThemeToggle />
          <CaregiverAccountMenu />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-2.5 border-b border-slate-300 dark:border-slate-800 pb-3 text-xs sm:text-sm font-bold">
          <Link to="/caregiver" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Overview
          </Link>
          <Link to="/session" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 font-bold">
            <Sparkles size={14} className="text-amber-500" />
            <span>Today's Session</span>
          </Link>
          <Link to="/caregiver/trends" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Trends & Adaptive AI
          </Link>
          <Link to="/caregiver/insights" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Explainable Insights
          </Link>
          <Link to="/caregiver/people" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Familiar People
          </Link>
          <Link to="/caregiver/reminders" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all font-bold">
            Reminders
          </Link>
          <Link to="/caregiver/history" className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white shadow-xs font-bold">
            Session History
          </Link>
        </div>

        {/* Sessions Summary Header */}
        <div className="card p-5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Sessions</h2>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
              {sessions.length} Session{sessions.length === 1 ? '' : 's'} • {completedCount} Completed • {inProgressCount} In Progress
            </p>
          </div>
          <Link
            to="/session"
            className="elderly-btn-primary text-xs py-2.5 px-5 rounded-xl inline-flex items-center gap-1.5 shrink-0"
          >
            <Sparkles size={15} />
            <span>Start Session</span>
          </Link>
        </div>

        {/* Sessions List */}
        <div className="card p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80">
          {sessions.length > 0 ? (
            <div className="space-y-3.5">
              {sessions.map((s) => {
                const sGames = gameSessions.filter(g => g.session_id === s.id);
                const isCompleted = s.status === 'completed' || s.status === 'Completed';
                const isAbandoned = s.status === 'abandoned';
                const isInProgress = !isCompleted && !isAbandoned;

                const validGames = sGames.filter(g => g.accuracy != null);
                const avgScore = validGames.length > 0
                  ? Math.round((validGames.reduce((acc, g) => acc + (g.accuracy || 0), 0) / validGames.length) * 100)
                  : null;

                const startDate = new Date(s.started_at);
                const formattedDate = startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                const formattedTime = startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-blue-400 dark:hover:border-blue-600"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : isInProgress
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                      }`}>
                        #{s.id}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            Session #{s.id}
                          </h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            • {formattedDate} at {formattedTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {sGames.length} {sGames.length === 1 ? 'activity' : 'activities'}
                          </span>

                          <span className="text-slate-300 dark:text-slate-600">•</span>

                          {isCompleted && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          )}

                          {isInProgress && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                              <Clock size={12} /> In Progress
                            </span>
                          )}

                          {isAbandoned && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                              Abandoned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700/80">
                      {isCompleted && avgScore != null && (
                        <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {avgScore}% Avg Score
                        </span>
                      )}

                      {isInProgress ? (
                        <button
                          onClick={() => handleResumeSession(s, sGames)}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Play size={14} fill="currentColor" />
                          <span>Resume Session</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenDetail(s)}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
                        >
                          <span>View Details</span>
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <Clock size={40} className="text-slate-400 dark:text-slate-500 mb-3" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">No session records found</h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-sm mb-4">
                This profile does not have any recorded cognitive sessions yet.
              </p>
              <Link
                to="/session"
                className="elderly-btn-primary text-xs sm:text-sm py-2.5 px-6 rounded-xl inline-flex items-center gap-2"
              >
                <Sparkles size={16} />
                <span>Start Session</span>
              </Link>
            </div>
          )}
        </div>

        {/* Session Detail Modal */}
        {selectedSessionDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700/90 max-w-lg w-full p-6 shadow-2xl relative text-slate-900 dark:text-white">
              <button
                onClick={() => setSelectedSessionDetail(null)}
                className="absolute top-4 right-4 text-slate-700 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Session #{selectedSessionDetail.session.id} Breakdown
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                  selectedSessionDetail.session.status === 'completed' || selectedSessionDetail.session.status === 'Completed'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                }`}>
                  {selectedSessionDetail.session.status === 'completed' || selectedSessionDetail.session.status === 'Completed' ? 'Completed' : 'In Progress'}
                </span>
              </div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5">
                Started on {new Date(selectedSessionDetail.session.started_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>

              {/* Summary stats row */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                    Activities Completed
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedSessionDetail.games.length} / 4
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                    Average Accuracy
                  </span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {selectedSessionDetail.games.filter(g => g.accuracy != null).length > 0
                      ? `${Math.round((selectedSessionDetail.games.reduce((acc, g) => acc + (g.accuracy || 0), 0) / selectedSessionDetail.games.filter(g => g.accuracy != null).length) * 100)}%`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Per game list */}
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                Activity Telemetry Detail
              </h4>

              {selectedSessionDetail.games.length > 0 ? (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedSessionDetail.games.map((g, gi) => (
                    <div key={gi} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{getGameLabel(g.game_type)}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          Difficulty Level {g.difficulty || 1} • {g.avg_response_time_ms ? `${Math.round(g.avg_response_time_ms)}ms latency` : 'Telemetry saved'}
                        </p>
                      </div>
                      <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 shrink-0 ml-3">
                        {g.accuracy != null ? `${Math.round(g.accuracy * 100)}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-3 text-center">
                  No individual activity telemetry recorded yet for this session.
                </p>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedSessionDetail(null)}
                  className="elderly-btn-primary text-xs py-2 px-5 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
