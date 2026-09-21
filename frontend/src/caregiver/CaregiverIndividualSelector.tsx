import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  Activity, 
  ChevronRight, 
  Plus, 
  Play, 
  Settings
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import AppLayout from '../components/layout/AppLayout';
import { User, OverallTrend } from '../types';

export default function CaregiverIndividualSelector() {
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
        console.error('Failed to load profiles in CaregiverIndividualSelector:', err);
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

  const handleSelectPersonPattern = (person: User) => {
    navigate(`/caregiver/person/${person.id}/pattern`);
  };

  return (
    <AppLayout mode="caregiver">
      <div className="space-y-5 max-w-5xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-850 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Users size={16} />
              <span>Individual Selector</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Select an Individual
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Choose a family member to view their personal behavioral pattern, baseline calibration, and session history.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Individual</span>
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
              Loading individual profiles...
            </p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Users size={40} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              No Individuals Registered
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Add your first elder or family member profile to start capturing personal behavioral telemetry.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-xs cursor-pointer"
            >
              Add First Profile
            </button>
          </div>
        ) : (
          /* Profile Cards List / Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profiles.map((person) => {
              const sessions = sessionCounts[person.id] || 0;
              const isCalibrated = sessions >= 3;
              const trend = trendsMap[person.id];
              const trendStatus = trend?.overall_status || (isCalibrated ? 'stable' : 'calibrating');
              const langLabel = person.preferred_language === 'te' ? 'Telugu' : person.preferred_language === 'hi' ? 'Hindi' : 'English';

              return (
                <div
                  key={person.id}
                  className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
                >
                  <div>
                    {/* Header: Avatar, Name, Age, Language */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-xs">
                          {(person.name || person.display_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {person.name || person.display_name}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {person.age ? `${person.age} yrs` : 'Elder'} • {langLabel}
                          </p>
                        </div>
                      </div>

                      {/* Calibration Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                          isCalibrated
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {isCalibrated ? 'Baseline Established' : `Calibrating ${sessions}/3`}
                      </span>
                    </div>

                    {/* Telemetry Summary Bar */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Sessions Observed:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{sessions}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Pattern Status:</span>
                        <span className="font-bold capitalize text-slate-800 dark:text-slate-200">
                          {trendStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: View Behavioral Pattern & Profile & Photos */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleSelectPersonPattern(person)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Activity size={16} />
                        <span>View Behavioral Pattern</span>
                      </span>
                      <ChevronRight size={16} />
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/caregiver/person/${person.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors"
                      >
                        <Settings size={14} />
                        <span>Profile & Photos</span>
                      </Link>

                      <button
                        onClick={() => {
                          switchProfile(person);
                          navigate('/activities');
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Launch Activity as this person"
                      >
                        <Play size={13} className="text-emerald-500" />
                        <span>Launch</span>
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
            <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                Add Cared-For Individual
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Register an individual profile to start personal baseline calibration.
              </p>

              <form onSubmit={handleCreateProfile} className="space-y-3.5">
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
                      Language
                    </label>
                    <select
                      value={newProfileLang}
                      onChange={(e) => setNewProfileLang(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    >
                      <option value="en">English</option>
                      <option value="te">Telugu</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? 'Saving...' : 'Add Individual'}
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
