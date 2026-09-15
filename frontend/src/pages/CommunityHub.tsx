import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Users2, Sparkles, Play, ArrowLeft, CheckSquare, Square, MessageSquare, Brain, ListOrdered, Puzzle, Clock, History, AlertCircle, RotateCcw, XCircle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';
import ThemeToggle from '../components/ThemeToggle';
import { User, CommunitySession } from '../types';

export default function CommunityHub() {
  const navigate = useNavigate();
  const { caregiver } = useApp();

  const [profiles, setProfiles] = useState<User[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<number[]>([]);
  const [sessionName, setSessionName] = useState('Morning Memory Circle');
  const [selectedActivity, setSelectedActivity] = useState<'memory_circle' | 'story_chain' | 'sequence_relay' | 'conversation_circle' | 'group_puzzle'>('memory_circle');
  const [recentSessions, setRecentSessions] = useState<CommunitySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [inProgressWarning, setInProgressWarning] = useState<CommunitySession | null>(null);
  const [viewSessionDetails, setViewSessionDetails] = useState<CommunitySession | null>(null);

  useEffect(() => {
    loadData();
  }, [caregiver]);

  const loadData = async () => {
    setLoading(true);
    try {
      const profs = await api.getProfiles(false);
      setProfiles(profs);
      // Default select all active profiles
      setSelectedProfileIds(profs.map(p => p.id));

      if (caregiver?.id) {
        const sessions = await api.getCaregiverCommunitySessions(caregiver.id);
        setRecentSessions(sessions);
      }
    } catch (err) {
      console.error('Error loading community profiles:', err);
    }
    setLoading(false);
  };

  const toggleProfile = (id: number) => {
    setSelectedProfileIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleStartSession = async (forceNew = false) => {
    if (selectedProfileIds.length === 0) {
      alert('Please select at least 1 participant for the group session.');
      return;
    }

    setStarting(true);
    try {
      const resp = await api.startCommunitySession(
        sessionName,
        selectedActivity,
        selectedProfileIds,
        `Facilitated group activity: ${selectedActivity}`,
        forceNew
      );

      if (resp.reused && !forceNew) {
        setInProgressWarning(resp);
        setStarting(false);
        return;
      }

      // Save active community session details to sessionStorage for the runner view
      sessionStorage.setItem('mindmitra_active_community_session', JSON.stringify({
        id: resp.id,
        name: resp.name || sessionName,
        activity_type: resp.activity_type || selectedActivity,
        profile_ids: resp.profile_ids || selectedProfileIds,
        participants: profiles.filter(p => (resp.profile_ids || selectedProfileIds).includes(p.id))
      }));

      navigate('/community/run');
    } catch (err: any) {
      alert(`Failed to start community session: ${err.message || 'Error occurred'}`);
    }
    setStarting(false);
  };

  const handleResumeSession = (session: CommunitySession) => {
    sessionStorage.setItem('mindmitra_active_community_session', JSON.stringify({
      id: session.id,
      name: session.name,
      activity_type: session.activity_type,
      profile_ids: session.participants?.map(p => p.profile_id) || profiles.map(p => p.id),
      participants: session.participants?.map(p => ({
        id: p.profile_id,
        display_name: p.profile_name || `Participant ${p.profile_id}`,
        name: p.profile_name || `Participant ${p.profile_id}`
      })) || profiles
    }));
    navigate('/community/run');
  };

  const handleAbandonSession = async (id: number) => {
    if (!confirm('Are you sure you want to mark this group session as abandoned?')) return;
    try {
      await api.abandonCommunitySession(id);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const cognitiveActivities = [
    {
      key: 'memory_circle',
      title: 'Memory Circle',
      tagline: 'Visual Recall Task',
      category: 'COGNITIVE GROUP',
      icon: Brain,
      color: 'from-blue-500 to-indigo-600',
      description: 'Show 6–8 visual items for a 10s viewing window. Hide objects and have participants select recalled items from a candidate grid.',
    },
    {
      key: 'sequence_relay',
      title: 'Sequence Relay',
      tagline: 'Step Ordering Challenge',
      category: 'COGNITIVE GROUP',
      icon: ListOrdered,
      color: 'from-emerald-500 to-teal-600',
      description: 'Pass the device to order daily sequences (e.g. Masala Chai, Morning Walk, Village Journey) and check sequence correctness.',
    },
    {
      key: 'group_puzzle',
      title: 'Group Visual Puzzle',
      tagline: 'Visual Tile Assembly',
      category: 'COGNITIVE GROUP',
      icon: Puzzle,
      color: 'from-cyan-500 to-blue-600',
      description: 'Interactive visual tile puzzle. Participants tap and swap tiles to reconstruct the traditional picture pattern.',
    },
  ];

  const socialActivities = [
    {
      key: 'story_chain',
      title: 'Story Chain',
      tagline: 'Collaborative Storytelling',
      category: 'SOCIAL ENGAGEMENT',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-600',
      description: 'Each participant adds a sentence to build a shared story from a nostalgic prompt card. Strictly social without cognitive scoring.',
    },
    {
      key: 'conversation_circle',
      title: 'Conversation Circle',
      tagline: 'Facilitator-Led Discussion',
      category: 'SOCIAL ENGAGEMENT',
      icon: MessageSquare,
      color: 'from-amber-500 to-orange-600',
      description: 'Heartwarming conversation themes with guided follow-up prompts, discussion countdown timer, and turn tracking.',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Navbar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-300 dark:border-slate-800 px-6 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/caregiver')}
            className="text-slate-900 dark:text-slate-300 hover:text-black dark:hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            title="Back to Caregiver Overview"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">MindMitra Community Hub</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                Low-Screen Group Engagement
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
              1 Facilitator • 1 Shared Screen • Multiple Elderly Participants • LOOK → THINK → TALK → SHARE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <CaregiverAccountMenu />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Main Banner */}
        <div className="card p-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white border-indigo-500/30 relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mb-3">
              <Users2 size={14} /> Low-Screen Facilitation
            </div>
            <h2 className="text-2xl font-black mb-2 text-white">One Shared Screen • Deep Human Interaction</h2>
            <p className="text-xs text-indigo-100 font-medium leading-relaxed mb-4">
              Community Mode is designed for living rooms, day-care centers, and family circles. The tablet or TV coordinates turns and provides prompts while participants converse face-to-face.
            </p>
          </div>
        </div>

        {/* Duplicate In-Progress Warning Modal */}
        {inProgressWarning && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="card max-w-md w-full p-6 bg-white dark:bg-slate-850 border-amber-500/50 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertCircle size={28} />
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Session Already In Progress</h3>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Session #{inProgressWarning.id} • {inProgressWarning.name}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                An active group session is already running for this caregiver account. Would you like to resume where you left off, or start a new group session?
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => handleResumeSession(inProgressWarning)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <RotateCcw size={15} />
                  <span>Resume In-Progress</span>
                </button>

                <button
                  onClick={() => {
                    setInProgressWarning(null);
                    handleStartSession(true);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
                >
                  <Play size={15} />
                  <span>Start New Session</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Completed Session Details Modal */}
        {viewSessionDetails && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="card max-w-lg w-full p-6 bg-white dark:bg-slate-850 border-slate-300 dark:border-slate-700 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{viewSessionDetails.name}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Activity: <strong className="text-indigo-600 dark:text-indigo-400 uppercase">{viewSessionDetails.activity_type.replace('_', ' ')}</strong> • {viewSessionDetails.duration_minutes || 15} mins
                  </span>
                </div>
                <button onClick={() => setViewSessionDetails(null)} className="p-1 rounded-lg text-slate-700 dark:text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Facilitator Notes:</span>
                  <p className="text-slate-600 dark:text-slate-400">{viewSessionDetails.notes || 'Session completed with all participants.'}</p>
                </div>

                <h4 className="text-xs font-extrabold uppercase text-slate-900 dark:text-white tracking-wider">Participant Highlights:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {viewSessionDetails.participants?.map((p, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.profile_name || `Profile #${p.profile_id}`}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">{p.notes || 'Attended actively'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewSessionDetails(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-white font-extrabold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Session Creator */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Name & Activity Picker */}
            <div className="card p-6 bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">1</span>
                <span>Configure Community Session</span>
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Session Title / Group Name
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Morning Memory Circle"
                  />
                </div>

                {/* Cognitive Activities Section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                      Cognitive Group Activities
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">(Interactive Group Challenge)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {cognitiveActivities.map((act) => {
                      const Icon = act.icon;
                      const isSelected = selectedActivity === act.key;
                      return (
                        <div
                          key={act.key}
                          onClick={() => setSelectedActivity(act.key as any)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 hover:border-indigo-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${act.color} text-white flex items-center justify-center font-black shadow-xs shrink-0`}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{act.title}</h4>
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">{act.tagline}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-tight">
                            {act.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Social Engagement Activities Section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      Social Engagement Activities
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">(Storytelling & Human Connection • No Cognitive Scoring)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {socialActivities.map((act) => {
                      const Icon = act.icon;
                      const isSelected = selectedActivity === act.key;
                      return (
                        <div
                          key={act.key}
                          onClick={() => setSelectedActivity(act.key as any)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 hover:border-indigo-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${act.color} text-white flex items-center justify-center font-black shadow-xs shrink-0`}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{act.title}</h4>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">{act.tagline}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-tight">
                            {act.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Select Participants */}
            <div className="card p-6 bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">2</span>
                  <span>Select Group Participants ({selectedProfileIds.length} Selected)</span>
                </h3>

                <button
                  onClick={() => {
                    if (selectedProfileIds.length === profiles.length) {
                      setSelectedProfileIds([]);
                    } else {
                      setSelectedProfileIds(profiles.map(p => p.id));
                    }
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {selectedProfileIds.length === profiles.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {profiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profiles.map((p) => {
                    const isChecked = selectedProfileIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProfile(p.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center">
                            {(p.display_name || p.name || 'U').charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold block text-slate-900 dark:text-white">
                              {p.display_name || p.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                              Age {p.age || '—'}
                            </span>
                          </div>
                        </div>

                        {isChecked ? (
                          <CheckSquare size={18} className="text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square size={18} className="text-slate-700 dark:text-slate-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-700 dark:text-slate-400 italic py-4 text-center">
                  No elderly profiles created yet. Create profiles in the Caregiver Overview first.
                </p>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleStartSession(false)}
                  disabled={starting || selectedProfileIds.length === 0}
                  className="elderly-btn-primary py-3.5 px-8 text-sm font-extrabold rounded-2xl flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Play size={18} fill="currentColor" />
                  <span>{starting ? 'Starting Session...' : 'Start Group Session'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Past Community Sessions */}
          <div className="space-y-6">
            <div className="card p-6 bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <History size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Group Session History</span>
                </h3>
              </div>

              {recentSessions.length > 0 ? (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {recentSessions.map((s) => {
                    const isInProgress = s.status === 'in_progress' || s.status === 'active';
                    const isCompleted = s.status === 'completed';
                    const isAbandoned = s.status === 'abandoned';

                    return (
                      <div key={s.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white block">{s.name}</span>
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">{s.activity_type.replace('_', ' ')}</span>
                          </div>
                          
                          {isInProgress && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                              In Progress
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                              Completed
                            </span>
                          )}
                          {isAbandoned && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-400">
                              Abandoned
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {new Date(s.started_at).toLocaleDateString()} • {s.participant_count || s.participants?.length || 0} Participants
                          {s.duration_minutes ? ` • ${s.duration_minutes} mins` : ''}
                        </p>

                        {/* Action buttons based on state */}
                        <div className="flex items-center gap-2 pt-1">
                          {isInProgress && (
                            <>
                              <button
                                onClick={() => handleResumeSession(s)}
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs"
                              >
                                <RotateCcw size={12} />
                                <span>Resume</span>
                              </button>
                              <button
                                onClick={() => handleAbandonSession(s.id)}
                                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-600 font-bold text-[11px]"
                              >
                                Abandon
                              </button>
                            </>
                          )}

                          {isCompleted && (
                            <button
                              onClick={() => setViewSessionDetails(s)}
                              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-white font-bold text-[11px] flex items-center gap-1 border border-slate-300 dark:border-slate-700"
                            >
                              <span>View Results</span>
                              <ChevronRight size={12} />
                            </button>
                          )}

                          {isAbandoned && (
                            <button
                              onClick={() => setViewSessionDetails(s)}
                              className="px-2 py-1 rounded-lg text-slate-700 dark:text-slate-400 hover:text-slate-700 font-semibold text-[11px]"
                            >
                              View Summary
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
                  <Clock size={28} className="mx-auto mb-2 opacity-50" />
                  No group sessions recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
