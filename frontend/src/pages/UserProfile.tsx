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
        {/* Profile Card Header */}
        <div className="card p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-xs shrink-0">
            {(currentUser?.name || currentUser?.display_name || 'U').charAt(0)}
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
              Individual Identity
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {currentUser?.name || currentUser?.display_name || 'Individual'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Age {currentUser?.age || 70} • Under Caregiver {caregiver?.name || 'Account'}
            </p>
          </div>
        </div>

        {/* Language Selection Card */}
        <div className="card p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Preferred Spoken Language
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium">
            Spoken activity instructions and visual text adapt to this selection.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
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
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer touch-target-48 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-600 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm font-black block">{l.label}</span>
                  <span className="text-[11px] text-slate-400 font-medium">{l.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio Assistance Card */}
        <div className="card p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Volume2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Spoken Voice Guidance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Audio instructions and encouragement during activities
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleVoice}
            className={`touch-target-48 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              voiceEnabled
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {voiceEnabled ? 'Enabled' : 'Muted'}
          </button>
        </div>

        {/* Caregiver Portal Link */}
        {caregiver && (
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Caregiver Portal & Office Kit
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Review long-term trends and family photos
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/caregiver')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <span>Open</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full touch-target-48 py-3 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out of MindMitra</span>
        </button>
      </div>
    </AppLayout>
  );
}
