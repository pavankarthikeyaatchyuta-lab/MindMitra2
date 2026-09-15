import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Brain, ListOrdered, Search, Sparkles, CheckCircle, ChevronRight, ArrowLeft, Play, ShieldCheck, Clock, Users } from 'lucide-react';
import { useTranslation } from '../i18n';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const ACTIVITIES = [
  {
    id: 'memory',
    type: 'memory_match',
    title: 'Memory Match',
    domain: 'Short-Term Memory',
    desc: 'Match familiar symbols to stimulate working memory and recall.',
    icon: Brain,
    emoji: '🧠',
  },
  {
    id: 'routine',
    type: 'daily_routine',
    title: 'Daily Routine Recall',
    domain: 'Sequential & Episodic Memory',
    desc: 'Reconstruct logical sequences of familiar daily tasks and morning rituals.',
    icon: ListOrdered,
    emoji: '📋',
  },
  {
    id: 'recognition',
    type: 'object_recognition',
    title: 'Object & Familiar Person Recognition',
    domain: 'Visual & Face Recognition',
    desc: 'Identify everyday household objects and caregiver-uploaded family photos.',
    icon: Search,
    emoji: '🔍',
  },
  {
    id: 'pattern',
    type: 'pattern_recall',
    title: 'Pattern Recall',
    domain: 'Pattern Recognition & Attention',
    desc: 'Observe symbol patterns and test sustained attention and recall speed.',
    icon: Sparkles,
    emoji: '✨',
  },
];

export default function Session() {
  const { t } = useTranslation();
  const { profileId } = useParams<{ profileId?: string }>();
  const { currentUser, switchProfile, setCurrentSession, currentDifficulty } = useApp();
  const navigate = useNavigate();

  const [completedGames, setCompletedGames] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('mindmitra_completed_games');
    return saved ? JSON.parse(saved) : [];
  });
  const [sessionId, setSessionId] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('mindmitra_session_id');
    return saved ? Number(saved) : null;
  });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function recoverProfile() {
      if (profileId) {
        try {
          const profile = await api.getProfile(Number(profileId));
          if (profile) switchProfile(profile);
        } catch {}
      } else if (!currentUser) {
        try {
          const profiles = await api.getProfiles(false);
          if (profiles && profiles.length > 0) {
            switchProfile(profiles[0]);
          }
        } catch {}
      }
    }
    recoverProfile();
  }, [profileId]);

  useEffect(() => {
    async function initSession() {
      if (!sessionId && currentUser) {
        try {
          const result = await api.startSession(currentUser.id);
          setSessionId(result.id);
          sessionStorage.setItem('mindmitra_session_id', String(result.id));
          setCurrentSession({
            id: result.id,
            user_id: currentUser.id,
            started_at: new Date().toISOString(),
            completed_at: null,
            status: 'active',
          });
        } catch (err) {
          const fallbackId = Date.now();
          setSessionId(fallbackId);
          sessionStorage.setItem('mindmitra_session_id', String(fallbackId));
        }
      }
    }
    initSession();
  }, [currentUser]);

  useEffect(() => {
    ACTIVITIES.forEach(a => {
      const isDone = sessionStorage.getItem(`mindmitra_game_done_${a.id}`);
      if (isDone === 'true') {
        setCompletedGames(prev => {
          if (!prev.includes(a.id)) {
            const next = [...prev, a.id];
            sessionStorage.setItem('mindmitra_completed_games', JSON.stringify(next));
            return next;
          }
          return prev;
        });
      }
    });
  }, []);

  const handleLaunchGame = async (gameId: string) => {
    setStarting(true);
    let activeSid = sessionId;

    if (!activeSid) {
      const uid = currentUser ? currentUser.id : 1;
      try {
        const res = await api.startSession(uid);
        activeSid = res.id;
      } catch {
        activeSid = Date.now();
      }
      setSessionId(activeSid);
      sessionStorage.setItem('mindmitra_session_id', String(activeSid));
      setCurrentSession({
        id: activeSid,
        user_id: uid,
        started_at: new Date().toISOString(),
        completed_at: null,
        status: 'active',
      });
    }

    sessionStorage.setItem('mindmitra_last_game', gameId);
    navigate(`/games/${gameId}`);
  };

  const handleStartFirstUnfinished = () => {
    const nextUnfinished = ACTIVITIES.find(a => !completedGames.includes(a.id));
    if (nextUnfinished) {
      handleLaunchGame(nextUnfinished.id);
    } else {
      handleLaunchGame('memory');
    }
  };

  const allCompleted = ACTIVITIES.every(g => completedGames.includes(g.id));

  const handleCompleteSession = async () => {
    if (sessionId) {
      try {
        await api.completeSession(sessionId);
      } catch {}
    }
    sessionStorage.removeItem('mindmitra_completed_games');
    sessionStorage.removeItem('mindmitra_session_id');
    ACTIVITIES.forEach(a => sessionStorage.removeItem(`mindmitra_game_done_${a.id}`));
    navigate('/session/complete');
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="flex justify-between items-center mb-6">
            <Link
              to="/caregiver"
              className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <ArrowLeft size={16} /> Back to Overview
            </Link>

            <div className="flex items-center gap-3">
              {currentUser && (
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  👤 {currentUser.display_name || currentUser.name} (Age {currentUser.age})
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Today's Cognitive Session
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>

          {/* Primary Quick Start CTA */}
          {!allCompleted && (
            <div className="mt-6">
              <button
                onClick={handleStartFirstUnfinished}
                className="elderly-btn-primary text-base sm:text-lg px-8 py-3.5 rounded-xl inline-flex items-center gap-2.5 shadow-md"
              >
                <Play size={20} fill="currentColor" />
                <span>
                  {completedGames.length === 0 ? "Start Today's Session" : `Continue Session (${completedGames.length}/4 Completed)`}
                </span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </header>

        {/* 4 Activities List */}
        <div className="flex flex-col gap-4">
          {ACTIVITIES.map((activity) => {
            const isCompleted = completedGames.includes(activity.id);
            const diff = currentDifficulty[activity.type as keyof typeof currentDifficulty] || 1;

            return (
              <div
                key={activity.id}
                className={`card p-5 sm:p-6 transition-all ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'hover:border-blue-400 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-2xl shrink-0">
                      {activity.emoji}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activity.title}</h2>
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                            <CheckCircle size={11} /> Completed
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{activity.domain}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md">{activity.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      Level {diff}
                    </span>

                    <button
                      onClick={() => handleLaunchGame(activity.id)}
                      className={`text-xs sm:text-sm font-bold py-2.5 px-5 rounded-xl inline-flex items-center gap-1.5 transition-all ${
                        isCompleted
                          ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                          : 'elderly-btn-primary'
                      }`}
                    >
                      <span>{isCompleted ? 'Replay' : 'Play'}</span>
                      <Play size={14} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Complete Session Action */}
        {allCompleted && (
          <div className="mt-8 card p-6 text-center border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CheckCircle size={36} className="text-emerald-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">All 4 activities completed!</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-4">
              Session metrics and baseline calculations are ready for caregiver review.
            </p>
            <button
              onClick={handleCompleteSession}
              className="elderly-btn-primary text-sm py-3 px-8 rounded-xl inline-flex items-center gap-2"
            >
              <span>Finish & View Report</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
