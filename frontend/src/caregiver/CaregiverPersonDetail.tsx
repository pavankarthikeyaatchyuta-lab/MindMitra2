import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Trash2, 
  ShieldCheck, 
  Activity, 
  Plus, 
  Camera,
  Play,
  AlertCircle,
  Settings
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import AppLayout from '../components/layout/AppLayout';
import { User, FamiliarPerson } from '../types';

export default function CaregiverPersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, switchProfile } = useApp();
  
  const [person, setPerson] = useState<User | null>(null);
  const [familiarPeople, setFamiliarPeople] = useState<FamiliarPerson[]>([]);
  const [loading, setLoading] = useState(true);

  // Familiar Person Modal State
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personRelationship, setPersonRelationship] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [photoValidationError, setPhotoValidationError] = useState<string | null>(null);
  const [savingPerson, setSavingPerson] = useState(false);

  // Delete Profile Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const personId = Number(id);

  useEffect(() => {
    async function loadPersonData() {
      if (!personId) return;
      setLoading(true);
      try {
        const profiles = await api.getProfiles(false);
        const current = profiles.find(p => p.id === personId);
        if (current) {
          setPerson(current);
        }

        const people = await api.getFamiliarPeople(personId);
        setFamiliarPeople(people || []);
      } catch (err) {
        console.error('Error loading person details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPersonData();
  }, [personId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoValidationError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoValidationError('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoValidationError('Image size is too large (Maximum 5MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width < 100 || img.height < 100) {
          setPhotoValidationError('Please upload a clearer photo with visible faces.');
          return;
        }
        setPhotoUrl(result);
      };
      img.onerror = () => {
        setPhotoValidationError('Could not load image. Please try another photo.');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFamiliarPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoValidationError(null);

    if (!personName.trim() || !personRelationship.trim()) {
      setPhotoValidationError('Please enter name and relationship.');
      return;
    }
    if (!photoUrl) {
      setPhotoValidationError('Please upload a clear face photo.');
      return;
    }
    if (!consentConfirmed) {
      setPhotoValidationError('Caregiver consent confirmation is required.');
      return;
    }

    setSavingPerson(true);
    try {
      await api.addFamiliarPerson({
        user_id: personId,
        name: personName.trim(),
        relationship: personRelationship.trim(),
        photo_url: photoUrl,
        consent_confirmed: consentConfirmed,
      });

      const updated = await api.getFamiliarPeople(personId);
      setFamiliarPeople(updated || []);
      setShowAddPersonModal(false);
      setPersonName('');
      setPersonRelationship('');
      setPhotoUrl('');
      setConsentConfirmed(false);
    } catch (err: any) {
      setPhotoValidationError(err?.message || 'Failed to save familiar person.');
    } finally {
      setSavingPerson(false);
    }
  };

  const handleDeleteFamiliarPerson = async (fpId: number) => {
    if (!window.confirm('Remove this person from Visual Recall exercises?')) return;
    try {
      await api.deleteFamiliarPerson(fpId);
      setFamiliarPeople(prev => prev.filter(p => p.id !== fpId));
    } catch (err) {
      console.error('Failed to delete familiar person:', err);
    }
  };

  const handleDeleteProfile = async () => {
    setDeletingProfile(true);
    setDeleteError(null);
    try {
      await api.deleteProfile(personId);
      // If deleted profile was active in context, switch to another profile
      const remaining = (await api.getProfiles(false)).filter(p => p.id !== personId);
      if (currentUser?.id === personId) {
        if (remaining.length > 0) {
          switchProfile(remaining[0]);
        }
      }
      setShowDeleteModal(false);
      navigate('/caregiver/individuals');
    } catch (err: any) {
      console.error('Failed to delete profile:', err);
      setDeleteError(err?.message || 'Failed to delete profile. Please ensure you have caregiver authorization.');
      setDeletingProfile(false);
    }
  };

  const handleLaunchActivity = () => {
    if (person) {
      switchProfile(person);
      navigate('/activities');
    }
  };

  return (
    <AppLayout mode="caregiver">
      <div className="space-y-6 max-w-5xl mx-auto w-full">
        {/* Top Back & Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/caregiver/individuals"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Back to Individuals"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Profile & Photos
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {person ? person.name || person.display_name : 'Individual Profile'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage family photos for Visual Recall activities, personal settings, and profile deletion.
            </p>
          </div>
        </div>

        {/* Quick Launch & Pattern Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
              {(person?.name || person?.display_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {person?.name || person?.display_name}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Language: {person?.preferred_language === 'te' ? 'Telugu' : person?.preferred_language === 'hi' ? 'Hindi' : 'English'} • Age: {person?.age || 'Elder'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Link
              to={`/caregiver/person/${personId}/pattern`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
            >
              <Activity size={16} />
              <span>View Pattern</span>
            </Link>

            <button
              onClick={handleLaunchActivity}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Play size={16} />
              <span>Launch Activity</span>
            </button>
          </div>
        </div>

        {/* FAMILIAR PEOPLE & PHOTOS FOR VISUAL RECALL */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera size={18} className="text-blue-600" />
                <span>Family Photos for Visual Recall ({familiarPeople.length})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These verified photos appear in the Visual Recall activity to reinforce memory and observe recognition patterns.
              </p>
            </div>

            <button
              onClick={() => setShowAddPersonModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Family Face</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">Loading photos...</p>
            </div>
          ) : familiarPeople.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <Users size={36} className="mx-auto text-slate-400 mb-2" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Familiar Photos Added</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Add photos of children, grandchildren, or relatives so they are recognized during daily Visual Recall exercises.
              </p>
              <button
                onClick={() => setShowAddPersonModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs"
              >
                Add First Photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {familiarPeople.map((personItem) => (
                <div
                  key={personItem.id}
                  className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div className="aspect-4/3 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    {personItem.photo_url ? (
                      <img
                        src={personItem.photo_url}
                        alt={personItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Users size={36} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={12} className="text-emerald-400" />
                      <span>Consented</span>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {personItem.name}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                        {personItem.relationship}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteFamiliarPerson(personItem.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PROFILE SETTINGS & DELETION */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3">
            <Settings size={18} className="text-slate-500" />
            <h3>Profile Settings</h3>
          </div>

          {/* Readonly Identity Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Individual Name</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{person?.name || person?.display_name || '--'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Age</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{person?.age ? `${person.age} years` : 'Elder'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Language Preference</span>
              <div className="flex items-center gap-1.5">
                {[
                  { code: 'en', label: 'EN' },
                  { code: 'te', label: 'తెలుగు' },
                  { code: 'hi', label: 'हिन्दी' },
                ].map((l) => {
                  const isSelected = (person?.preferred_language || 'te') === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={async () => {
                        if (!personId) return;
                        try {
                          await api.updateProfile(personId, { preferred_language: l.code });
                          setPerson(prev => prev ? { ...prev, preferred_language: l.code } : null);
                          if (currentUser && currentUser.id === personId) {
                            switchProfile({ ...currentUser, preferred_language: l.code });
                          }
                        } catch (err) {
                          console.warn('Could not update profile language preference:', err);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Explicit Delete Profile Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
              <div>
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                  <span>Delete Profile</span>
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 max-w-xl">
                  Permanently delete {person?.name || 'this individual'}'s profile. This will remove all cognitive session history, baseline calibration records, and familiar photos. This action is non-reversible.
                </p>
              </div>

              <button
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteModal(true);
                }}
                className="self-start sm:self-auto shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Delete Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Person Modal */}
        {showAddPersonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Add Family Member Photo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Upload a clear photo for Visual Recall exercises.
              </p>

              {photoValidationError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{photoValidationError}</span>
                </div>
              )}

              <form onSubmit={handleSaveFamiliarPerson} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="e.g. Priya"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    required
                    value={personRelationship}
                    onChange={(e) => setPersonRelationship(e.target.value)}
                    placeholder="e.g. Daughter / Grandson"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Face Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {photoUrl && (
                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentConfirmed}
                      onChange={(e) => setConsentConfirmed(e.target.checked)}
                      className="mt-0.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                      I confirm caregiver consent for this photo to be used in personal cognitive recall activities.
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPersonModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPerson}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {savingPerson ? 'Saving...' : 'Add Photo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Profile Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-3 text-rose-600 dark:text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Delete {person?.name || 'Individual'}'s Profile?
                  </h3>
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Permanent Destructive Action
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 mb-4 text-xs text-rose-800 dark:text-rose-300 leading-relaxed space-y-1.5">
                <p className="font-semibold">
                  Are you sure you want to permanently delete <strong className="text-rose-950 dark:text-rose-100">{person?.name}</strong>?
                </p>
                <p>
                  This action will permanently delete:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                  <li>All cognitive activity session history & telemetry</li>
                  <li>Personal baseline calibration & MAD variance data</li>
                  <li>On-device adaptive ML difficulty adjustments</li>
                  <li>All verified family photos for Visual Recall</li>
                </ul>
                <p className="text-[11px] font-bold pt-1 text-rose-900 dark:text-rose-200">
                  This action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={deletingProfile}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingProfile}
                  onClick={handleDeleteProfile}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {deletingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Delete Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
