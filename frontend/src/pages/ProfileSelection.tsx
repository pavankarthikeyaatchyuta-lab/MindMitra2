import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Brain, ArrowRight, ShieldCheck, MoreVertical, Edit2, Archive, Trash2, RotateCcw, Download, Search, Volume2, Globe, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';
import ThemeToggle from '../components/ThemeToggle';

export default function ProfileSelection() {
  const navigate = useNavigate();
  const { caregiver, currentUser, switchProfile } = useApp();
  
  const [activeProfiles, setActiveProfiles] = useState<any[]>([]);
  const [archivedProfiles, setArchivedProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [archivingProfile, setArchivingProfile] = useState<any | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<any | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State (for Create & Edit)
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState<number | ''>(70);
  const [formLanguage, setFormLanguage] = useState<'en' | 'hi' | 'te'>('en');
  const [formVoice, setFormVoice] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllProfiles = async () => {
    setLoading(true);
    try {
      const [actives, archives] = await Promise.all([
        api.getProfiles(false),
        api.getArchivedProfiles(),
      ]);
      setActiveProfiles(actives);
      setArchivedProfiles(archives);
    } catch (err) {
      console.log('Error loading profiles');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllProfiles();
  }, []);

  const handleSelectProfile = (profile: any) => {
    switchProfile(profile);
    navigate('/caregiver');
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      const created = await api.createProfile({
        name: formName.trim(),
        age: Number(formAge) || 70,
        preferred_language: formLanguage,
        voice_enabled: formVoice,
      });

      setShowAddModal(false);
      setFormName('');
      showToast(`${created.name} added successfully.`);
      await loadAllProfiles();
      switchProfile(created);
      navigate('/caregiver');
    } catch {
      showToast('Failed to create profile.');
    }
  };

  const handleOpenEdit = (profile: any) => {
    setActionMenuOpenId(null);
    setEditingProfile(profile);
    setFormName(profile.name || profile.display_name);
    setFormAge(profile.age);
    setFormLanguage(profile.preferred_language || 'en');
    setFormVoice(profile.voice_enabled ?? true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !formName.trim()) return;

    try {
      await api.updateProfile(editingProfile.id, {
        name: formName.trim(),
        age: Number(formAge) || 70,
        preferred_language: formLanguage,
        voice_enabled: formVoice,
      });
      setEditingProfile(null);
      showToast('Profile details updated.');
      await loadAllProfiles();
    } catch {
      showToast('Failed to update profile.');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archivingProfile) return;
    try {
      await api.archiveProfile(archivingProfile.id);
      showToast(`${archivingProfile.name} archived.`);
      setArchivingProfile(null);
      await loadAllProfiles();
    } catch {
      showToast('Failed to archive profile.');
    }
  };

  const handleRestore = async (profile: any) => {
    try {
      await api.restoreProfile(profile.id);
      showToast(`${profile.name} restored to active profiles.`);
      await loadAllProfiles();
    } catch {
      showToast('Failed to restore profile.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProfile) return;
    if (deleteConfirmInput !== deletingProfile.name) return;

    try {
      await api.deleteProfile(deletingProfile.id);
      showToast(`${deletingProfile.name} permanently deleted.`);
      setDeletingProfile(null);
      setDeleteConfirmInput('');
      await loadAllProfiles();
    } catch {
      showToast('Failed to delete profile.');
    }
  };

  const handleExportData = async (profile: any) => {
    setActionMenuOpenId(null);
    try {
      const data = await api.exportProfileData(profile.id);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mindmitra_profile_${profile.id}_export.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Profile data exported successfully.');
    } catch {
      showToast('Export failed.');
    }
  };

  const displayedProfiles = (activeTab === 'active' ? activeProfiles : archivedProfiles).filter(p => {
    const pName = (p.name || p.display_name || '').toLowerCase();
    return pName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 max-w-6xl mx-auto bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header with ThemeToggle and Account Menu */}
      <header className="flex flex-wrap justify-between items-center gap-y-2 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Brain size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">MindMitra</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Caregiver Multi-Profile Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <CaregiverAccountMenu />
        </div>
      </header>

      {/* Main Section */}
      <main className="my-8 flex flex-col items-center">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-black text-black dark:text-white tracking-tight">
            Who are you caring for today?
          </h2>
          <p className="text-slate-900 dark:text-slate-200 mt-2 text-sm sm:text-base max-w-xl font-medium">
            Select an elderly profile. All game sessions, baselines, and family memories remain completely isolated.
          </p>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'active'
                  ? 'bg-white dark:bg-slate-700 text-black dark:text-white shadow-xs'
                  : 'text-slate-800 dark:text-slate-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Active Profiles {loading ? '(...)' : `(${activeProfiles.length})`}
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'archived'
                  ? 'bg-white dark:bg-slate-700 text-black dark:text-white shadow-xs'
                  : 'text-slate-800 dark:text-slate-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Archived {loading ? '(...)' : `(${archivedProfiles.length})`}
            </button>
          </div>

          {(activeProfiles.length > 2 || archivedProfiles.length > 0) && (
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-2.5 text-slate-700 dark:text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search profiles..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Profiles Grid & 3-State Loading Architecture */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3 w-full">
            <div className="w-10 h-10 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Loading elderly profiles...</p>
          </div>
        ) : displayedProfiles.length === 0 ? (
          <div className="card p-12 text-center w-full max-w-md my-6 border border-dashed border-slate-300 dark:border-slate-700">
            <p className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">
              {activeTab === 'active' ? 'No active elderly profiles yet.' : 'No archived profiles.'}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="elderly-btn-primary text-sm py-2.5 px-6 rounded-xl inline-flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span>+ Add Elderly Profile</span>
              </button>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {displayedProfiles.map((p) => {
            const isSelected = currentUser && currentUser.id === p.id;
            const isMenuOpen = actionMenuOpenId === p.id;

            return (
              <div
                key={p.id}
                className={`card p-6 relative flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                    : 'hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Card Top: Avatar, Lang Badge, and [ ⋮ ] Action Menu */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      onClick={() => activeTab === 'active' && handleSelectProfile(p)}
                      className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-xs cursor-pointer"
                    >
                      {p.name ? p.name.charAt(0) : p.display_name?.charAt(0) || '👤'}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono uppercase font-bold">
                        {p.preferred_language || 'EN'}
                      </span>

                      {/* Action Menu Trigger */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpenId(isMenuOpen ? null : p.id);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          title="Profile Options"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* Action Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-1.5 text-xs animate-in fade-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                            >
                              <Edit2 size={14} className="text-blue-500" />
                              <span>Edit Profile</span>
                            </button>

                            <button
                              onClick={() => handleExportData(p)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                            >
                              <Download size={14} className="text-emerald-500" />
                              <span>Export Data (JSON)</span>
                            </button>

                            {activeTab === 'active' ? (
                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setArchivingProfile(p);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
                              >
                                <Archive size={14} />
                                <span>Archive Profile</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  handleRestore(p);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium"
                              >
                                <RotateCcw size={14} />
                                <span>Restore Profile</span>
                              </button>
                            )}

                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setDeletingProfile(p);
                                setDeleteConfirmInput('');
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold"
                            >
                              <Trash2 size={14} />
                              <span>Delete Profile</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {p.name || p.display_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Age {p.age} • {p.preferred_language === 'te' ? 'Telugu' : p.preferred_language === 'hi' ? 'Hindi' : 'English'} • Voice {p.voice_enabled ? 'ON' : 'OFF'}
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Status</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {activeTab === 'active' ? 'Active Profile' : 'Archived'}
                    </span>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-6">
                  {activeTab === 'active' ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          switchProfile(p);
                          navigate('/personal-pattern');
                        }}
                        className="elderly-btn-primary w-full text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>📱 Phone Companion</span>
                        <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => handleSelectProfile(p)}
                        className="elderly-btn-secondary w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <span>📊 Caregiver Overview</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRestore(p)}
                      className="elderly-btn-secondary w-full text-sm py-2.5 rounded-xl flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={15} />
                      <span>Restore to Active</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Profile Card */}
          {activeTab === 'active' && (
            <div
              onClick={() => {
                setFormName('');
                setFormAge(70);
                setFormLanguage('en');
                setFormVoice(true);
                setShowAddModal(true);
              }}
              className="card p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] group transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Plus size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Elderly Profile</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                Create a personalized cognitive profile for another family member.
              </p>
            </div>
          )}
        </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
        <ShieldCheck size={16} className="text-blue-500" />
        <span>Caregiver Isolation Active — Each profile maintains private sessions & baselines.</span>
      </footer>

      {/* --- MODAL: CREATE PROFILE --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="card max-w-lg w-full p-7 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-700 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Add Elderly Profile</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Create a new isolated cognitive profile under your caregiver account.
            </p>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Senior Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={120}
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English (India)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Volume2 size={18} className="text-blue-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Voice Guidance</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Spoken instructions during games</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formVoice}
                  onChange={(e) => setFormVoice(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT PROFILE --- */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="card max-w-lg w-full p-7 shadow-2xl relative">
            <button
              onClick={() => setEditingProfile(null)}
              className="absolute top-4 right-4 text-slate-700 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Edit Profile Details</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Update preferences for {editingProfile.name || editingProfile.display_name}.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Senior Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={120}
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English (India)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Volume2 size={18} className="text-blue-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Voice Guidance</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Spoken instructions during games</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formVoice}
                  onChange={(e) => setFormVoice(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ARCHIVE PROFILE --- */}
      {archivingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="card max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Archive size={24} />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Archive {archivingProfile.name}?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              Archiving hides this profile from active session lists while preserving all historical data, baseline calculations, and family photos. You can restore it anytime.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setArchivingProfile(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: DELETE PROFILE (WITH TYPE CONFIRMATION) --- */}
      {deletingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="card max-w-md w-full p-6 shadow-2xl border-rose-200 dark:border-rose-900">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">Permanently Delete Profile?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              This will permanently delete <strong>{deletingProfile.name}</strong> and cascade-remove all historical gameplay sessions, telemetry, baselines, and family photos. This action cannot be undone.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Type <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{deletingProfile.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={deletingProfile.name}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setDeletingProfile(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmInput !== deletingProfile.name}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white shadow-xs"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
