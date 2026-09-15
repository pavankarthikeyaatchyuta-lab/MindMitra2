import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pill, Droplets, Calendar, Activity, Plus, Trash2, Users, Volume2, Sparkles, X } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';
import ThemeToggle from '../components/ThemeToggle';
import { User, Reminder } from '../types';
import { useVoice } from '../hooks/useVoice';
import { useTranslation } from '../i18n';

export default function Reminders() {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId?: string }>();
  const { currentUser, switchProfile } = useApp();
  const { speak } = useVoice();
  const { language } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  // Form State
  const [type, setType] = useState('medication');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00 AM');
  const [repeatPattern, setRepeatPattern] = useState('Daily');

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
    loadReminders();
  }, [selectedUserId]);

  const loadReminders = async () => {
    try {
      const data = await api.getReminders(selectedUserId!);
      setReminders(data);
    } catch {
      console.log('Error loading reminders');
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await api.createReminder({
        user_id: selectedUserId!,
        type,
        title: title.trim(),
        time,
        repeat_pattern: repeatPattern,
        enabled: true,
      });

      setTitle('');
      setShowAdd(false);
      loadReminders();
    } catch {
      console.log('Error saving reminder');
    }
  };

  const handleToggleEnabled = async (rem: Reminder) => {
    if (!rem.id) return;
    try {
      await api.updateReminder(rem.id, {
        ...rem,
        enabled: !rem.enabled,
      });
      loadReminders();
    } catch {
      console.log('Error toggling reminder');
    }
  };

  const handleSpeakReminder = async (rem: Reminder) => {
    if (!rem.id) return;
    setSpeakingId(rem.id);
    const spokenText = language === 'hi'
      ? `याद दिलाने के लिए: ${rem.title}, समय है ${rem.time}`
      : language === 'te'
      ? `జ్ఞాపిక: ${rem.title}, సమయం ${rem.time}`
      : `Reminder: ${rem.title}, scheduled for ${rem.time}`;
    
    await speak(spokenText, language);
    setSpeakingId(null);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteReminder(id);
      loadReminders();
    } catch {
      console.log('Error deleting reminder');
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'medication': return <Pill size={18} className="text-blue-500" />;
      case 'hydration': return <Droplets size={18} className="text-cyan-500" />;
      case 'appointment': return <Calendar size={18} className="text-purple-500" />;
      default: return <Activity size={18} className="text-emerald-500" />;
    }
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
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Daily & Medication Reminders</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Audio and visual daily prompts for routine support</p>
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
          <Link to="/caregiver/trends" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Trends & Adaptive AI
          </Link>
          <Link to="/caregiver/insights" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Explainable Insights
          </Link>
          <Link to="/caregiver/people" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Familiar People
          </Link>
          <Link to="/caregiver/reminders" className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
            Reminders
          </Link>
          <Link to="/caregiver/history" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Session History
          </Link>
        </div>

        {/* Header & Add CTA */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Profile Reminders</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Scheduled routine prompts for the senior</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="elderly-btn-primary text-xs sm:text-sm py-2 px-4 rounded-xl inline-flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Add Reminder</span>
          </button>
        </div>

        {/* Reminders List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminders.map((r) => (
            <div key={r.id} className="card p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  {getTypeIcon(r.type)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{r.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.time} • {r.repeat_pattern}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSpeakReminder(r)}
                  disabled={speakingId === r.id}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-750"
                  title="Speak reminder"
                >
                  <Volume2 size={16} className={speakingId === r.id ? 'animate-pulse' : ''} />
                </button>
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => handleToggleEnabled(r)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <button
                  onClick={() => r.id && handleDelete(r.id)}
                  className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {reminders.length === 0 && (
            <div className="col-span-full card p-8 text-center">
              <Calendar size={36} className="text-slate-700 dark:text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No reminders scheduled</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                Schedule medication, hydration, or activity reminders that speak in the senior's preferred language.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="elderly-btn-primary text-xs py-2 px-5 rounded-xl inline-flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Create Reminder</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="card max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setShowAdd(false)}
                className="absolute top-4 right-4 text-slate-700 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X size={18} />
              </button>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Add Daily Reminder</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Set up a spoken routine cue for this profile.</p>

              <form onSubmit={handleAddReminder} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reminder Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="medication">💊 Medication</option>
                    <option value="hydration">💧 Hydration</option>
                    <option value="appointment">📅 Appointment</option>
                    <option value="activity">🏃 Activity / Exercise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Afternoon Blood Pressure Tablet"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Time</label>
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="09:00 AM"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Repeat</label>
                    <select
                      value={repeatPattern}
                      onChange={(e) => setRepeatPattern(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Weekdays">Weekdays</option>
                      <option value="Once">Once</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                  >
                    Create Reminder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
