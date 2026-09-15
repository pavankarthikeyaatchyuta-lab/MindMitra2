import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Users, KeyRound, ShieldCheck, ChevronDown, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export default function CaregiverAccountMenu() {
  const navigate = useNavigate();
  const { caregiver, logout } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    logout();
    navigate('/login');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setLoading(true);

    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg({ text: 'Password successfully updated!', isError: false });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to update password. Verify current password.', isError: true });
    }
    setLoading(false);
  };

  const caregiverName = caregiver ? caregiver.name : 'Caregiver';
  const caregiverEmail = caregiver ? caregiver.email : '';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all text-left shadow-sm group"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {caregiverName.charAt(0)}
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {caregiverName}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Caregiver Account</span>
        </div>
        <ChevronDown size={14} className={`text-slate-700 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-1.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Caregiver Info Header */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-700 mb-1">
            <p className="font-bold text-slate-900 dark:text-white text-sm">{caregiverName}</p>
            <p className="text-slate-500 dark:text-slate-400 truncate text-[11px]">{caregiverEmail}</p>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              navigate('/profiles');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-medium"
          >
            <Users size={15} className="text-blue-600 dark:text-blue-400" />
            <span>Profile Selection</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              setShowSettingsModal(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-medium"
          >
            <Settings size={15} className="text-slate-500 dark:text-slate-400" />
            <span>Account Security</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all font-semibold"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Security & Password Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="card max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-700 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Account Security</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage caregiver authentication & password</p>
              </div>
            </div>

            {passwordMsg && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
                passwordMsg.isError
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}>
                {passwordMsg.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
