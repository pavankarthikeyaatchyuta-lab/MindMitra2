import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Edit2, ShieldCheck, Upload, AlertCircle, CheckCircle, Users, Sparkles, Image as ImageIcon, X } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';
import ThemeToggle from '../components/ThemeToggle';
import { User, FamiliarPerson } from '../types';

export default function FamiliarPeople() {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId?: string }>();
  const { currentUser, switchProfile } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [people, setPeople] = useState<FamiliarPerson[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

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
        } else if (currentUser && profiles.some(p => p.id === currentUser.id)) {
          setSelectedUserId(currentUser.id);
        } else if (profiles.length > 0) {
          setSelectedUserId(profiles[0].id);
          switchProfile(profiles[0]);
        }
      } catch (err: any) {
        console.error('[FamiliarPeople] Failed to load caregiver profiles:', err?.detail || err?.message);
      }
    }
    init();
  }, [profileId]);

  useEffect(() => {
    if (!selectedUserId) return;
    loadPeople();
  }, [selectedUserId]);

  const loadPeople = async () => {
    setLoading(true);
    try {
      const data = await api.getFamiliarPeople(selectedUserId!);
      setPeople(data);
    } catch (err: any) {
      console.error(`[FamiliarPeople] Error loading familiar people for profile_id=${selectedUserId}:`, err?.detail || err?.message);
    }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setValidationError('Image size is too large (Maximum 5MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width < 120 || img.height < 120) {
          setValidationError('Please upload a clearer photo with one visible face.');
          return;
        }
        setPhotoUrl(result);
      };
      img.onerror = () => {
        setValidationError('Please upload a clearer photo with one visible face.');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedUserId) {
      setValidationError('Please select a valid senior profile.');
      return;
    }
    if (!name.trim()) {
      setValidationError('Please enter person name');
      return;
    }
    if (!relationship.trim()) {
      setValidationError('Please enter relationship');
      return;
    }
    if (!photoUrl) {
      setValidationError('Please upload a clear face photo');
      return;
    }
    if (!consentConfirmed) {
      setValidationError('Caregiver consent confirmation is required to include family photos in exercises.');
      return;
    }

    try {
      if (editingId) {
        await api.updateFamiliarPerson(editingId, {
          name: name.trim(),
          relationship: relationship.trim(),
          photo_url: photoUrl,
          consent_confirmed: consentConfirmed,
        });
      } else {
        await api.addFamiliarPerson({
          user_id: selectedUserId,
          name: name.trim(),
          relationship: relationship.trim(),
          photo_url: photoUrl,
          consent_confirmed: consentConfirmed,
        });
      }

      setShowAddModal(false);
      setName('');
      setRelationship('');
      setPhotoUrl('');
      setConsentConfirmed(false);
      setEditingId(null);
      await loadPeople();
    } catch (err: any) {
      console.error('[FamiliarPeople] Save failed:', {
        status: err?.status,
        endpoint: editingId ? `/api/familiar-people/${editingId}` : '/api/familiar-people',
        profile_id: selectedUserId,
        detail: err?.detail || err?.message,
      });
      setValidationError('Unable to save this familiar person. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this family member from recognition activities?')) return;
    try {
      await api.deleteFamiliarPerson(id);
      await loadPeople();
    } catch {
      alert('Failed to delete person');
    }
  };

  const openEdit = (p: FamiliarPerson) => {
    setEditingId(p.id || null);
    setName(p.name);
    setRelationship(p.relationship);
    setPhotoUrl(p.photo_url);
    setConsentConfirmed(p.consent_confirmed);
    setShowAddModal(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Top Navbar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-300 dark:border-slate-800 px-6 py-3.5 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/caregiver')}
            className="text-slate-900 dark:text-slate-300 hover:text-black dark:hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            title="Back to Overview"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black text-black dark:text-white">Familiar People & Photos</h1>
            <p className="text-[11px] text-slate-900 dark:text-slate-400 font-semibold">Caregiver-managed family cues for personal recognition</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {users.length > 0 && (
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-700 dark:text-blue-400" />
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setSelectedUserId(newId);
                  const u = users.find(user => user.id === newId);
                  if (u) switchProfile(u);
                }}
                className="p-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-black dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <Link to="/caregiver/people" className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
            Familiar People
          </Link>
          <Link to="/caregiver/reminders" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Reminders
          </Link>
          <Link to="/caregiver/history" className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all">
            Session History
          </Link>
        </div>

        {/* Section Header & Add CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Family Recognition Photos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Caregiver-uploaded photos are integrated into Object & Familiar Recognition exercises.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setName('');
              setRelationship('');
              setPhotoUrl('');
              setConsentConfirmed(false);
              setShowAddModal(true);
            }}
            className="elderly-btn-primary text-xs sm:text-sm py-2.5 px-4 rounded-xl inline-flex items-center gap-2"
          >
            <UserPlus size={16} />
            <span>Add Family Member</span>
          </button>
        </div>

        {/* People Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {people.map((p) => (
            <div key={p.id} className="card p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={p.photo_url}
                  alt={p.name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{p.relationship}</p>
                  <p className="text-[10px] text-slate-700 dark:text-slate-400 mt-0.5">Consent: Verified ✓</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(p)}
                  className="p-1.5 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-750"
                  title="Edit"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(p.id!)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {people.length === 0 && !loading && (
            <div className="col-span-full card p-8 text-center">
              <ImageIcon size={36} className="text-slate-700 dark:text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No familiar people added</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                Add family photos to allow the senior to practice facial and relationship recall in a familiar context.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="elderly-btn-primary text-xs py-2 px-5 rounded-xl inline-flex items-center gap-1.5"
              >
                <UserPlus size={15} />
                <span>Add Family Photo</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="card max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-slate-700 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X size={18} />
              </button>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {editingId ? 'Edit Family Member' : 'Add Family Member'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Used in Object & Familiar Recognition cognitive activities.
              </p>

              {validationError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <form onSubmit={handleSavePerson} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                  <input
                    type="text"
                    required
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="e.g. Granddaughter"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Photo Upload</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-700 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {photoUrl && (
                    <div className="mt-2 flex items-center gap-3">
                      <img src={photoUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                      <span className="text-[11px] text-emerald-600 font-semibold">Photo ready ✓</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentConfirmed}
                    onChange={(e) => setConsentConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="consent" className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug cursor-pointer">
                    I confirm that I have consent to use this photo for memory exercises under this profile.
                  </label>
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
                    Save Photo
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
