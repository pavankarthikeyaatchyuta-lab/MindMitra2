import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Sparkles, 
  Activity, 
  Laptop, 
  Plus, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle,
  Play,
  Heart
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import AppLayout from '../components/layout/AppLayout';
import { User, OverallTrend } from '../types';

export default function CaregiverOverview() {
  const navigate = useNavigate();
  const { caregiver, currentUser, switchProfile } = useApp();
  const [profiles, setProfiles] = useState<User[]>([]);
  const [trendsMap, setTrendsMap] = useState<Record<number, OverallTrend | null>>({});
  const [sessionCounts, setSessionCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAge, setNewProfileAge] = useState('72');
  const [newProfileLang, setNewProfileLang] = useState('en');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const userList = await api.getProfiles(false);
        setProfiles(userList);

        // Fetch overall trend and session counts for each profile
        const counts: Record<number, number> = {};
        const trends: Record<number, OverallTrend | null> = {};

        await Promise.all(
          userList.map(async (u) => {
            try {
              const sessions = await api.getUserSessions(u.id);
              counts[u.id] = sessions ? sessions.length : 0;
            } catch {
              counts[u.id] = 0;
            }

            try {
              const trend = await api.getOverallTrend(u.id);
              trends[u.id] = trend;
            } catch {
              trends[u.id] = null;
            }
          })
        );

        setSessionCounts(counts);
        setTrendsMap(trends);
      } catch (err) {
        console.error('Failed to load profiles in CaregiverOverview:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    setCreating(true);
    try {
      const created = await api.createProfile({
        name: newProfileName.trim(),
        age: parseInt(newProfileAge, 10) || 70,
        preferred_language: newProfileLang,
        voice_enabled: true,
      });

      setProfiles((prev) => [...prev, created]);
      setSessionCounts((prev) => ({ ...prev, [created.id]: 0 }));
      setTrendsMap((prev) => ({ ...prev, [created.id]: null }));
      setShowAddModal(false);
      setNewProfileName('');
    } catch (err) {
      console.error('Failed to create profile:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleLaunchActivityAs = (person: User) => {
    switchProfile(person);
    navigate('/activities');
  };

  return (
    <AppLayout mode="caregiver">
      <div className="space-y-6 max-w-6xl mx-auto w-full">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-850 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <ShieldCheck size={16} />
              <span>Caregiver Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Cared-For Individuals
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Personal behavioral baselines and longitudinal patterns for each loved one.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/caregiver/office-kit"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs sm:text-sm transition-all"
            >
              <Laptop size={16} />
              <span>Office Kit Live Bridge</span>
            </Link>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Individual</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Loading individuals and behavioral telemetry...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Users size={40} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Profiles Registered Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              Add your first elder or family member profile to begin personal behavioral calibration.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs"
            >
              Add First Profile
            </button>
          </div>
        ) : (
          /* Profile Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map((person) => {
              const sessions = sessionCounts[person.id] || 0;
              const isCalibrated = sessions >= 3;
              const trend = trendsMap[person.id];
              const trendStatus = trend?.overall_status || (isCalibrated ? 'stable' : 'calibrating');

              return (
                <div
                  key={person.id}
                  className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div>
                    {/* Header: Avatar, Name, Relationship */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
                          {(person.name || person.display_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {person.name || person.display_name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {person.age ? `${person.age} yrs` : 'Elder'} • {person.preferred_language === 'te' ? 'Telugu' : person.preferred_language === 'hi' ? 'Hindi' : 'English'}
                          </p>
                        </div>
                      </div>

                      {/* Calibration Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          isCalibrated
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {isCalibrated ? 'Baseline Established' : `Calibrating ${sessions}/3`}
                      </span>
                    </div>

                    {/* Behavioral Status & Sessions Bar */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 mb-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Behavioral Pattern:</span>
                        <span className="font-bold capitalize text-slate-800 dark:text-slate-200">
                          {trendStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Sessions Observed:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{sessions}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      to={`/caregiver/person/${person.id}/pattern`}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Activity size={15} />
                        <span>View Behavioral Pattern</span>
                      </span>
                      <ChevronRight size={15} />
                    </Link>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/caregiver/person/${person.id}`}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors"
                      >
                        <span>Person & Photos</span>
                      </Link>

                      <button
                        onClick={() => handleLaunchActivityAs(person)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Play size={13} className="text-emerald-500" />
                        <span>Launch Activity</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Profile Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Add Cared-For Individual
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Register an elder profile to start building their personal behavioral memory.
              </p>

              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      value={newProfileAge}
                      onChange={(e) => setNewProfileAge(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Preferred Language
                    </label>
                    <select
                      value={newProfileLang}
                      onChange={(e) => setNewProfileLang(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    >
                      <option value="en">English</option>
                      <option value="te">తెలుగు (Telugu)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newProfileName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? 'Creating...' : 'Add Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
