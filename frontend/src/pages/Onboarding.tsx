import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { User, Language } from '../types';
import { UserPlus, ChevronRight, ArrowLeft } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Onboarding() {
  const { t, setLanguage } = useTranslation();
  const { setCurrentUser } = useAppContext();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>('en');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [existingUsers, setExistingUsers] = useState<User[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const users = await api.getUsers();
        const unique = Array.from(new Map(users.map(item => [item.display_name, item])).values());
        setExistingUsers(unique);
      } catch {}
    }
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age) return;

    try {
      const result = await api.createUser({
        display_name: name.trim(),
        age: parseInt(age, 10),
        preferred_language: preferredLanguage,
        voice_enabled: voiceEnabled,
      });

      const newUser: User = {
        id: result.id,
        display_name: name.trim(),
        age: parseInt(age, 10),
        preferred_language: preferredLanguage,
        voice_enabled: voiceEnabled,
        created_at: new Date().toISOString(),
      };

      setLanguage(preferredLanguage);
      setCurrentUser(newUser);
      navigate('/session');
    } catch (err) {
      const fakeUser: User = {
        id: Date.now(),
        display_name: name.trim(),
        age: parseInt(age, 10),
        preferred_language: preferredLanguage,
        voice_enabled: voiceEnabled,
        created_at: new Date().toISOString(),
      };
      setLanguage(preferredLanguage);
      setCurrentUser(fakeUser);
      navigate('/session');
    }
  };

  const handleSelectUser = (user: User) => {
    if (user.preferred_language && (user.preferred_language === 'en' || user.preferred_language === 'hi' || user.preferred_language === 'te')) {
      setLanguage(user.preferred_language as Language);
    }
    setCurrentUser(user);
    navigate('/session');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        <button
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
        >
          <ArrowLeft size={16} /> Back to Welcome
        </button>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-1 text-center">User Profile</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
          Create or choose a profile to begin cognitive activities
        </p>

        {/* Existing Users Selection */}
        {existingUsers.length > 0 && (
          <div className="mb-6 card p-5">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
              Continue as Existing Profile
            </h2>
            <div className="space-y-2">
              {existingUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-left flex items-center justify-between text-slate-900 dark:text-white transition-colors"
                >
                  <span className="font-bold text-sm">{u.display_name || u.name}</span>
                  <ChevronRight size={16} className="text-slate-700 dark:text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create Profile Card */}
        <div className="card p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
            <span>Create New Profile</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Senior Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Age</label>
              <input
                type="number"
                required
                min={40}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="70"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as Language)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English (India)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>

            <button
              type="submit"
              className="elderly-btn-primary w-full text-base py-3 rounded-xl mt-2 flex items-center justify-center gap-2"
            >
              <span>Begin Cognitive Session</span>
              <ChevronRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
