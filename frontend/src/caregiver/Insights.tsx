import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, Users, ShieldCheck, Info } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';
import ThemeToggle from '../components/ThemeToggle';
import { User, TrendData } from '../types';

const DOMAIN_ICONS: Record<string, string> = {
  short_term_memory: '🧠',
  sequential_episodic_memory: '📋',
  visual_familiar_recognition: '🔍',
  pattern_attention: '✨',
  memory_match: '🧠',
  daily_routine: '📋',
  object_recognition: '🔍',
  pattern_recall: '✨',
};

const DOMAIN_LABELS: Record<string, string> = {
  short_term_memory: 'Short-Term Memory',
  sequential_episodic_memory: 'Sequential / Episodic Memory',
  visual_familiar_recognition: 'Visual & Familiar-Person Recognition',
  pattern_attention: 'Pattern Recognition & Attention',
  memory_match: 'Short-Term Memory',
  daily_routine: 'Sequential / Episodic Memory',
  object_recognition: 'Visual & Familiar-Person Recognition',
  pattern_recall: 'Pattern Recognition & Attention',
};

const STATUS_BADGES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  stable: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', label: 'Stable' },
  improving: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', label: 'Improving' },
  recent_change: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', label: 'Recent Change' },
  variable: { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', label: 'Variable' },
  observation_available: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', label: 'Observation Available' },
  insufficient_history: { color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', label: 'Insufficient History' },
};

export default function Insights() {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId?: string }>();
  const { currentUser, switchProfile } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [explanations, setExplanations] = useState<Record<string, { text: string; provider: string }>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
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
  }, [profileId]);

  useEffect(() => {
    if (!selectedUserId) return;
    async function loadData() {
      setLoading(true);
      try {
        const [t, insights] = await Promise.all([
          api.getTrends(selectedUserId!),
          api.getAllInsights(selectedUserId!),
        ]);
        setTrends(t);

        const expMap: Record<string, { text: string; provider: string }> = {};
        for (const ins of insights) {
          expMap[ins.domain || ins.game_type || ''] = {
            text: ins.insight,
            provider: ins.provider || 'gemini-2.0-flash',
          };
        }
        setExplanations(expMap);
      } catch (err) {
        console.log('Could not load insights');
      }
      setLoading(false);
    }
    loadData();
  }, [selectedUserId]);

  const generateExplanation = async (t: TrendData) => {
    const domainKey = t.domain || t.game_type;
    setLoadingExplanation(domainKey);
    try {
      const res = await api.explainInsight(
        DOMAIN_LABELS[domainKey] || domainKey,
        t.trend,
        `Current: ${Math.round((t.current_performance || 0) * 100)}%, Baseline: ${Math.round((t.baseline || 0) * 100)}%, Deviation: ${Math.round((t.deviation || 0) * 100)}%`
      );
      setExplanations(prev => ({
        ...prev,
        [domainKey]: { text: res.explanation, provider: res.provider || 'gemini-2.0-flash' },
      }));
    } catch {
      setExplanations(prev => ({
        ...prev,
        [domainKey]: {
          text: `Performance for ${DOMAIN_LABELS[domainKey] || domainKey} is currently ${t.trend}. This is a behavioral observation for caregiver support.`,
          provider: 'template',
        },
      }));
    }
    setLoadingExplanation(null);
  };

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
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Explainable AI Insights</h1>
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
          <Link to="/caregiver/trends" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Trends & Adaptive AI
          </Link>
          <Link to="/caregiver/insights" className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
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

        {/* Informational Banner */}
        <div className="card p-4 border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-xs flex items-center gap-3">
          <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-slate-700 dark:text-slate-300">
            Insights are plain-language behavioral summaries synthesized by Google Gemini 2.0 Flash to assist caregivers in understanding routine game engagement.
          </span>
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {trends.map((t) => {
            const domainKey = t.domain || t.game_type;
            const badge = STATUS_BADGES[t.trend] || STATUS_BADGES.insufficient_history;
            const explanation = explanations[domainKey];
            const isLoading = loadingExplanation === domainKey;

            return (
              <div key={domainKey} className="card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{DOMAIN_ICONS[domainKey] || '🧠'}</span>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {DOMAIN_LABELS[domainKey] || domainKey}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {(t.sessions_analyzed ?? t.sessions_used ?? 0)} eligible sessions recorded
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.color} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Summary Explanation */}
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed min-h-[80px] flex items-center">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold py-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Synthesizing caregiver explanation...</span>
                      </div>
                    ) : explanation ? (
                      <p>{explanation.text}</p>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 italic">
                        {t.trend === 'insufficient_history'
                          ? 'Baseline calibration in progress. Additional sessions will unlock detailed natural language explanations.'
                          : 'Click below to synthesize a tailored caregiver summary for this cognitive domain.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.current_performance != null ? `Score: ${Math.round(t.current_performance * 100)}%` : 'No score'}
                  </span>
                  <button
                    onClick={() => generateExplanation(t)}
                    disabled={isLoading}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>{explanation ? 'Regenerate AI Summary' : 'Generate AI Summary'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
