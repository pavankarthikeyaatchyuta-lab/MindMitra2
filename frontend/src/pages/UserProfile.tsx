import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Globe, 
  Volume2, 
  LogOut, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Users
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import ThemeToggle from '../components/ThemeToggle';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { Language } from '../types';

export default function UserProfile() {
  const navigate = useNavigate();
  const { currentUser, caregiver, switchProfile, updateUserProfile, logout } = useApp();
  const { language, setLanguage } = useTranslation();

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(currentUser?.voice_enabled ?? true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleLanguageChange = async (newLang: Language) => {
    setLanguage(newLang);
    if (currentUser) {
      const updatedUser = { ...currentUser, preferred_language: newLang };
      switchProfile(updatedUser);
      localStorage.setItem('mindmitra_current_user', JSON.stringify(updatedUser));
      try {
        await updateUserProfile(currentUser.id, { preferred_language: newLang });
      } catch {}
    }
  };

  const handleToggleVoice = async () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (currentUser) {
      try {
        await updateUserProfile(currentUser.id, { voice_enabled: next });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } catch {}
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppLayout mode="user">
      <div className="max-w-xl mx-auto w-full flex flex-col gap-5 animate-in fade-in">
        {/* 1. Account & Individual Identity Card */}
        <div className="card p-4 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-xs shrink-0">
              {(currentUser?.name || currentUser?.display_name || 'U').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-blue-600 dark:text-blue-400">
                  Individual Profile
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                  Active
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {currentUser?.name || currentUser?.display_name || 'Individual'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Age {currentUser?.age || 70} • Preferred: {currentUser?.preferred_language?.toUpperCase() || 'EN'}
              </p>
            </div>
          </div>

          {/* Account Details Box */}
          <div className="mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-1 text-slate-600 dark:text-slate-300">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Caregiver Account</span>
              <span className="font-bold text-slate-900 dark:text-white">{caregiver?.name || 'Caregiver'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Account Email</span>
              <span className="font-mono text-slate-900 dark:text-white truncate max-w-[200px]">{caregiver?.email || 'pavan@mindmitra.com'}</span>
            </div>
          </div>
        </div>

        {/* 2. Theme Selection Card */}
        <div className="card p-4 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              Display Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Comfortable high-contrast Light or Dark appearance
            </p>
          </div>
          <ThemeToggle showLabels={true} />
        </div>

        {/* 3. Language Selection Card */}
        <div className="card p-4 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              Preferred Spoken Language
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
            Spoken activity instructions and visual text adapt to this selection.
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {[
              { code: 'en', label: 'English', sub: 'English' },
              { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
              { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
            ].map(l => {
              const isSelected = language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => handleLanguageChange(l.code as Language)}
                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-center transition-all cursor-pointer touch-target-48 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-600 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-black block">{l.label}</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">{l.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Audio Assistance Card */}
        <div className="card p-4 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Volume2 size={19} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Spoken Voice Guidance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Audio instructions during activities
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleVoice}
            className={`touch-target-48 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              voiceEnabled
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {voiceEnabled ? 'Enabled' : 'Muted'}
          </button>
        </div>

        {/* 5. Caregiver Portal Quick Switch */}
        {caregiver && (
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Caregiver Portal & Office Kit
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Review long-term trends and family photos
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/caregiver')}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Open</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* 6. CLEAR, PROMINENT LOG OUT BUTTON */}
        <div className="pt-2">
          <button
            onClick={handleSignOut}
            className="w-full touch-target-48 py-3.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-base font-black flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <LogOut size={18} />
            <span>LOG OUT</span>
          </button>
          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Ends current session. Your personal baseline and behavioral history remain safely preserved.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
