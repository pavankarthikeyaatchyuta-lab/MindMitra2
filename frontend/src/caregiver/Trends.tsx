import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Sparkles, TrendingUp, TrendingDown, Clock, ShieldCheck, Users, Activity } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';
import ThemeToggle from '../components/ThemeToggle';
import { User, TrendData, AdaptiveDecision, GameSession } from '../types';

export default function Trends() {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId?: string }>();
  const { currentUser, switchProfile } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adaptiveHistory, setAdaptiveHistory] = useState<AdaptiveDecision[]>([]);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);

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
  }, [profileId]);

  useEffect(() => {
    if (!selectedUserId) return;
    async function loadData() {
      try {
        const [ah, gs, t] = await Promise.all([
          api.getAdaptiveHistory(selectedUserId!),
          api.getUserGameSessions(selectedUserId!),
          api.getTrends(selectedUserId!),
        ]);
        setAdaptiveHistory(ah);
        setGameSessions(gs);
        setTrends(t);
      } catch (err) {
        console.log('Could not load trends data');
      }
    }
    loadData();
  }, [selectedUserId]);

  const sessionsByNumber: Record<number, any> = {};
  gameSessions.forEach((gs, idx) => {
    const sNum = Math.floor(idx / 4) + 1;
    if (!sessionsByNumber[sNum]) {
      sessionsByNumber[sNum] = { session: `S${sNum}` };
    }
    if (gs.game_type === 'memory_match') {
      sessionsByNumber[sNum].memory_acc = Math.round((gs.accuracy || 0) * 100);
      sessionsByNumber[sNum].memory_diff = gs.difficulty || 1;
    } else if (gs.game_type === 'daily_routine') {
      sessionsByNumber[sNum].routine_acc = Math.round((gs.accuracy || 0) * 100);
      sessionsByNumber[sNum].routine_diff = gs.difficulty || 1;
    } else if (gs.game_type === 'object_recognition') {
      sessionsByNumber[sNum].recognition_acc = Math.round((gs.accuracy || 0) * 100);
      sessionsByNumber[sNum].recognition_diff = gs.difficulty || 1;
    } else if (gs.game_type === 'pattern_recall') {
      sessionsByNumber[sNum].pattern_acc = Math.round((gs.accuracy || 0) * 100);
      sessionsByNumber[sNum].pattern_diff = gs.difficulty || 1;
    }
  });

  const timelineData = Object.values(sessionsByNumber);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Top Navbar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/caregiver')}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            title="Back to Overview"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <TrendingUp size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Longitudinal Trends & Adaptive ML</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Multi-session baseline variance and telemetry</p>
            </div>
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
                  setSelectedUserId(newId);
                  const u = users.find(user => user.id === newId);
                  if (u) switchProfile(u);
                }}
                className="p-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="flex flex-wrap gap-2 sm:gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs sm:text-sm font-semibold">
          <Link to="/caregiver" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Overview
          </Link>
          <Link to="/session" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span>Today's Session</span>
          </Link>
          <Link to="/caregiver/trends" className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
            Trends & Adaptive AI
          </Link>
          <Link to="/caregiver/insights" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Explainable Insights
          </Link>
          <Link to="/caregiver/people" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Familiar People
          </Link>
          <Link to="/caregiver/reminders" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Reminders
          </Link>
          <Link to="/caregiver/history" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Session History
          </Link>
        </div>

        {/* Multi-Domain Accuracy Chart */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Longitudinal Performance Across 4 Games</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Tracking individual accuracy across consecutive cognitive sessions</p>

          {timelineData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
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
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Line type="monotone" name="Memory Match" dataKey="memory_acc" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" name="Daily Routine" dataKey="routine_acc" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" name="Object Recognition" dataKey="recognition_acc" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" name="Pattern Recall" dataKey="pattern_acc" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No historical sessions recorded yet. Play today's session to begin tracking longitudinal trends.
            </div>
          )}
        </div>

        {/* Adaptive AI Decision History */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Adaptive Machine Learning Adjustments</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Evaluations performed by the trained RandomForest model on gameplay latency and errors
          </p>

          {adaptiveHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 font-bold">Game</th>
                    <th className="py-2.5 font-bold">Previous Level</th>
                    <th className="py-2.5 font-bold">ML Recommendation</th>
                    <th className="py-2.5 font-bold">New Level</th>
                    <th className="py-2.5 font-bold">Model Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {adaptiveHistory.slice(-10).reverse().map((ad, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 font-semibold capitalize">{ad.game_type.replace('_', ' ')}</td>
                      <td className="py-2.5">Level {ad.previous_difficulty}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          ad.recommendation === 'INCREASE'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : ad.recommendation === 'DECREASE'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {ad.recommendation}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-blue-600 dark:text-blue-400">Level {ad.recommended_difficulty}</td>
                      <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400">{Math.round((ad.confidence || 0.85) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No adaptive decisions recorded yet. Complete activities to train the dynamic personalization engine.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
