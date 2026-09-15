import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, ArrowRight, CheckCircle2, Users, Sparkles, MessageSquare, Brain, Clock, ShieldCheck, Volume2, ChevronRight, Eye, EyeOff, ListOrdered, Puzzle, RotateCcw, Award, Check, Shuffle, Mic, MicOff, SkipForward, CheckSquare } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

export default function CommunitySessionRun() {
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState<any>(null);
  const [activeTurnIndex, setActiveTurnIndex] = useState(0);
  const [participantNotes, setParticipantNotes] = useState<Record<string, string>>({});
  const [completedTurns, setCompletedTurns] = useState<Record<number, boolean>>({});
  const [completing, setCompleting] = useState(false);

  // --- ACTIVITY 1: MEMORY CIRCLE STATE ---
  const memoryTargets = ['🍎 Apple', '🌺 Flower', '🐕 Pet Dog', '🚲 Bicycle', '🏠 Village House', '☀️ Bright Sun', '🔔 Temple Bell', '🪔 Brass Diya'];
  const memoryCandidates = [
    '🍎 Apple', '🌺 Flower', '🐕 Pet Dog', '🚲 Bicycle', 
    '🏠 Village House', '☀️ Bright Sun', '🔔 Temple Bell', '🪔 Brass Diya',
    '🍉 Watermelon', '🐘 Royal Elephant', '🚗 Motor Car', '🌙 Crescent Moon'
  ];
  const [memoryPhase, setMemoryPhase] = useState<'viewing' | 'recalling' | 'feedback'>('viewing');
  const [memoryTimer, setMemoryTimer] = useState(10);
  const [selectedRecallItems, setSelectedRecallItems] = useState<string[]>([]);
  const [memoryScore, setMemoryScore] = useState<{ hits: number; total: number; accuracy: number } | null>(null);

  // --- ACTIVITY 2: SEQUENCE RELAY STATE ---
  const sequenceTasks = [
    {
      title: "Making Traditional Masala Chai",
      steps: [
        "Boil fresh water with crushed cardamom and ginger",
        "Add premium Assam tea leaves and allow flavor to infuse",
        "Pour fresh milk and bring the mixture to a boil",
        "Simmer gently on low flame for two minutes",
        "Strain hot aromatic chai into clay cups"
      ]
    },
    {
      title: "Morning Routine for Wellbeing",
      steps: [
        "Wake up at sunrise and drink a glass of warm water",
        "Perform gentle morning stretches and peaceful prayer",
        "Enjoy a wholesome breakfast with fresh fruits",
        "Take prescribed morning vitamins and medication",
        "Take a peaceful 15-minute walk in the garden"
      ]
    },
    {
      title: "Planting a Sacred Tulsi Herb",
      steps: [
        "Prepare a clean terracotta pot with rich organic soil",
        "Gently position the green Tulsi sapling in the center",
        "Fill and press the soil firmly around the root base",
        "Sprinkle fresh water evenly across the surface soil",
        "Place the potted herb in bright morning sunlight"
      ]
    }
  ];

  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [sequenceItems, setSequenceItems] = useState<string[]>([]);
  const [sequenceSubmitted, setSequenceSubmitted] = useState(false);
  const [sequenceCorrect, setSequenceCorrect] = useState(false);
  const [sequenceAttempts, setSequenceAttempts] = useState(0);
  const [sequenceMoves, setSequenceMoves] = useState(0);
  const [wrongPositions, setWrongPositions] = useState<number[]>([]);

  // Fisher-Yates shuffle that guarantees not in correct order
  const getShuffledSequence = (steps: string[]) => {
    let copy = [...steps];
    let tries = 0;
    while (tries < 15) {
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      // Check if at least one item is displaced
      if (copy.some((s, idx) => s !== steps[idx])) {
        return copy;
      }
      tries++;
    }
    // Fallback: swap first two
    [copy[0], copy[1]] = [copy[1], copy[0]];
    return copy;
  };

  // --- ACTIVITY 3: GROUP VISUAL PUZZLE STATE ---
  const puzzleMotifs = ['🦚 Peacock', '🌺 Lotus', '🐘 Elephant', '🪔 Diya', '☀️ Sun', '🏰 Palace', '🌴 Palm', '⛵ Boat', '🎵 Sitar'];
  const [puzzleGrid, setPuzzleGrid] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const [puzzleSelectedIdx, setPuzzleSelectedIdx] = useState<number | null>(null);
  const [puzzleMoves, setPuzzleMoves] = useState(0);
  const [puzzleSolved, setPuzzleSolved] = useState(false);

  // --- ACTIVITY 4: STORY CHAIN STATE ---
  const [storyChainLines, setStoryChainLines] = useState<Array<{ author: string; text: string }>>([
    { author: 'Prompt Card', text: 'It was the festive evening of Diwali in the ancestral courtyard, and the courtyard was glowing with warm oil lamps...' }
  ]);
  const [newStoryInput, setNewStoryInput] = useState('');

  // --- ACTIVITY 5: CONVERSATION CIRCLE STATE ---
  const conversationPrompts = [
    {
      title: "Favorite Festival Memories",
      mainPrompt: "What was your absolute favorite festival celebration when you were young?",
      subPrompts: [
        "What special traditional dish or sweet aroma do you remember the most?",
        "Who in your family or neighborhood was celebrating with you?",
        "What made those childhood celebrations feel so unforgettable?"
      ]
    },
    {
      title: "First Journey Outside Home",
      mainPrompt: "What was the very first town, city, or pilgrimage you traveled to?",
      subPrompts: [
        "How did you travel (steam train, bullock cart, bus)?",
        "What surprised you the most when you arrived?",
        "What souvenir or memory did you bring back home?"
      ]
    }
  ];
  const [convTimer, setConvTimer] = useState(60);
  const [isConvTimerActive, setIsConvTimerActive] = useState(false);
  const [convSharedCheck, setConvSharedCheck] = useState<Record<number, boolean>>({});

  // Initialize session data & randomize interactive activities
  useEffect(() => {
    const raw = sessionStorage.getItem('mindmitra_active_community_session');
    if (raw) {
      try {
        setSessionData(JSON.parse(raw));
      } catch {}
    } else {
      setSessionData({
        id: 101,
        name: 'Morning Memory & Story Circle',
        activity_type: 'memory_circle',
        participants: [
          { id: 1, display_name: 'Rajesh Kumar', name: 'Rajesh Kumar', age: 72 },
          { id: 2, display_name: 'Sunita Devi', name: 'Sunita Devi', age: 68 },
          { id: 3, display_name: 'Ramesh Kumar', name: 'Ramesh Kumar', age: 75 },
        ]
      });
    }

    // Initialize Sequence Relay with shuffled items
    setSequenceItems(getShuffledSequence(sequenceTasks[0].steps));

    // Initialize Puzzle Grid with shuffled positions
    const shuffledPuzzle = [1, 2, 0, 4, 3, 5, 7, 6, 8];
    setPuzzleGrid(shuffledPuzzle);
  }, []);

  // Timer effect for Memory Circle Viewing Phase
  useEffect(() => {
    let interval: any = null;
    if (sessionData?.activity_type === 'memory_circle' && memoryPhase === 'viewing' && memoryTimer > 0) {
      interval = setInterval(() => setMemoryTimer(t => t - 1), 1000);
    } else if (memoryPhase === 'viewing' && memoryTimer === 0) {
      setMemoryPhase('recalling');
    }
    return () => clearInterval(interval);
  }, [memoryPhase, memoryTimer, sessionData]);

  // Timer effect for Conversation Circle
  useEffect(() => {
    let interval: any = null;
    if (isConvTimerActive && convTimer > 0) {
      interval = setInterval(() => setConvTimer(t => t - 1), 1000);
    } else if (convTimer === 0) {
      setIsConvTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isConvTimerActive, convTimer]);

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-6">
        <div className="text-center font-bold">Loading Group Session...</div>
      </div>
    );
  }

  const participants: User[] = sessionData.participants || [];
  const currentParticipant = participants[activeTurnIndex] || participants[0] || { display_name: 'Participant 1', id: 0 };
  const isTurnCompleted = !!completedTurns[currentParticipant.id];
  const nextParticipant = participants[(activeTurnIndex + 1) % participants.length];

  // Advance turn handler with fresh randomization
  const handleNextTurn = () => {
    if (participants.length > 0) {
      const nextIdx = (activeTurnIndex + 1) % participants.length;
      setActiveTurnIndex(nextIdx);

      // Reset activity turn state for the next participant
      setMemoryPhase('viewing');
      setMemoryTimer(10);
      setSelectedRecallItems([]);
      setMemoryScore(null);

      // Rotate task for next participant or re-shuffle fresh sequence
      const nextTaskIdx = nextIdx % sequenceTasks.length;
      setCurrentTaskIndex(nextTaskIdx);
      setSequenceItems(getShuffledSequence(sequenceTasks[nextTaskIdx].steps));
      setSequenceSubmitted(false);
      setSequenceCorrect(false);
      setSequenceAttempts(0);
      setSequenceMoves(0);
      setWrongPositions([]);

      // Reset puzzle selection
      setPuzzleSelectedIdx(null);
    }
  };

  // Explicit Facilitator Skip Turn Override
  const handleSkipTurn = async () => {
    if (confirm(`Skip turn for ${currentParticipant.display_name || currentParticipant.name}? This will record the turn as skipped.`)) {
      try {
        if (sessionData.id) {
          await api.recordCommunityEvent({
            community_session_id: sessionData.id,
            profile_id: currentParticipant.id,
            activity_key: sessionData.activity_type,
            event_type: 'turn_skipped',
            data: {
              participant_name: currentParticipant.display_name || currentParticipant.name,
              skipped: true,
              completed: false,
              reason: 'facilitator_skip'
            }
          });
        }
      } catch (e) {
        console.warn('Failed to record skip event:', e);
      }
      handleNextTurn();
    }
  };

  // Mark turn as successfully finished
  const markTurnComplete = async (activityType: string, eventData: any = {}) => {
    setCompletedTurns(prev => ({ ...prev, [currentParticipant.id]: true }));

    // Record community telemetry event (strictly isolated from individual clinical baseline)
    try {
      if (sessionData.id) {
        await api.recordCommunityEvent({
          community_session_id: sessionData.id,
          profile_id: currentParticipant.id,
          activity_key: activityType,
          event_type: 'turn_completed',
          data: {
            participant_name: currentParticipant.display_name || currentParticipant.name,
            ...eventData
          }
        });
      }
    } catch (e) {
      console.warn('Failed to record event:', e);
    }
  };

  // Finish whole group session
  const handleCompleteSession = async () => {
    setCompleting(true);
    try {
      if (sessionData.id) {
        await api.completeCommunitySession(
          sessionData.id,
          15,
          'Facilitated group session completed successfully with active participation.',
          participantNotes
        );
      }
      sessionStorage.removeItem('mindmitra_active_community_session');
      navigate('/community');
    } catch (err: any) {
      alert(`Error saving session: ${err.message || 'Error'}`);
    }
    setCompleting(false);
  };

  // --- MEMORY CIRCLE HANDLERS ---
  const toggleRecallItem = (item: string) => {
    if (memoryPhase !== 'recalling') return;
    setSelectedRecallItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const submitMemoryRecall = () => {
    const hits = selectedRecallItems.filter(item => memoryTargets.includes(item)).length;
    const accuracy = Math.round((hits / memoryTargets.length) * 100);
    setMemoryScore({ hits, total: memoryTargets.length, accuracy });
    setMemoryPhase('feedback');
    markTurnComplete('memory_circle', { hits, accuracy });
  };

  // --- SEQUENCE RELAY HANDLERS ---
  const swapSequenceItems = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= sequenceItems.length || sequenceCorrect) return;
    const copy = [...sequenceItems];
    const temp = copy[fromIdx];
    copy[fromIdx] = copy[toIdx];
    copy[toIdx] = temp;
    setSequenceItems(copy);
    setSequenceMoves(m => m + 1);

    // Reset validation state on user edit
    if (sequenceSubmitted && !sequenceCorrect) {
      setSequenceSubmitted(false);
      setWrongPositions([]);
    }
  };

  const checkSequenceOrder = () => {
    if (sequenceCorrect) return;
    const attempts = sequenceAttempts + 1;
    setSequenceAttempts(attempts);
    const targetSteps = sequenceTasks[currentTaskIndex].steps;

    const wrongs: number[] = [];
    sequenceItems.forEach((item, idx) => {
      if (item !== targetSteps[idx]) {
        wrongs.push(idx);
      }
    });

    const isAllCorrect = wrongs.length === 0;
    setSequenceSubmitted(true);
    setSequenceCorrect(isAllCorrect);
    setWrongPositions(wrongs);

    if (isAllCorrect) {
      markTurnComplete('sequence_relay', {
        attempts,
        moves: sequenceMoves,
        correct: true,
        completed: true,
        task_title: sequenceTasks[currentTaskIndex].title
      });
    }
  };

  // --- VISUAL PUZZLE HANDLERS ---
  const handlePuzzleTileClick = (idx: number) => {
    if (puzzleSolved) return;
    if (puzzleSelectedIdx === null) {
      setPuzzleSelectedIdx(idx);
    } else {
      // Swap tiles
      const copy = [...puzzleGrid];
      const temp = copy[puzzleSelectedIdx];
      copy[puzzleSelectedIdx] = copy[idx];
      copy[idx] = temp;
      setPuzzleGrid(copy);
      setPuzzleMoves(m => m + 1);
      setPuzzleSelectedIdx(null);

      // Check if solved
      const isNowSolved = copy.every((tile, i) => tile === i);
      if (isNowSolved) {
        setPuzzleSolved(true);
        markTurnComplete('group_puzzle', { moves: puzzleMoves + 1, solved: true });
      }
    }
  };

  // --- STORY CHAIN HANDLERS ---
  const handleAddStorySentence = () => {
    if (!newStoryInput.trim()) return;
    const newEntry = {
      author: currentParticipant.display_name || currentParticipant.name || 'Senior Participant',
      text: newStoryInput.trim()
    };
    setStoryChainLines(prev => [...prev, newEntry]);
    setNewStoryInput('');
    markTurnComplete('story_chain', { contribution_length: newStoryInput.length });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 transition-all">
      {/* Top Facilitator Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/community')}
            className="p-2.5 rounded-xl bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-white border border-slate-800"
            title="Return to Community Hub"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Community Mode • Pass-and-Play
              </span>
              <h1 className="text-base font-extrabold text-white">{sessionData.name}</h1>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
              Shared Tablet/Screen • {participants.length} Seniors in Circle • Turn {activeTurnIndex + 1} of {participants.length}
            </p>
          </div>
        </div>

        <button
          onClick={handleCompleteSession}
          disabled={completing}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          <span>{completing ? 'Saving Group Session...' : 'Finish Group Session'}</span>
        </button>
      </div>

      {/* Main Presentation Canvas */}
      <div className="my-auto max-w-4xl mx-auto w-full py-4 space-y-6">
        {/* Pass-and-Play Turn Indicator Card */}
        <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 rounded-3xl p-5 border border-indigo-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-indigo-400/30 shrink-0">
              {(currentParticipant.display_name || currentParticipant.name || 'P').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
                  Current Turn (Pass Device)
                </span>
                {isTurnCompleted && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Check size={12} /> Turn Completed
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-white">
                {currentParticipant.display_name || currentParticipant.name}'s Turn
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSkipTurn}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5"
              title="Skip this turn if participant needs more time"
            >
              <SkipForward size={14} />
              <span>Skip Turn</span>
            </button>

            <button
              onClick={handleNextTurn}
              disabled={!isTurnCompleted}
              className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all ${
                isTurnCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50 cursor-pointer animate-pulse'
                  : 'bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <span>Next: {nextParticipant?.display_name || nextParticipant?.name}</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* ACTIVITY 1: MEMORY CIRCLE (COGNITIVE GROUP) */}
        {/* ---------------------------------------------------- */}
        {sessionData.activity_type === 'memory_circle' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                  Cognitive Group Activity
                </span>
                <h3 className="text-base font-extrabold text-white mt-1 flex items-center gap-2">
                  <Brain size={18} className="text-indigo-400" /> Memory Circle: Visual Scene Recall
                </h3>
              </div>

              {memoryPhase === 'viewing' && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-700 font-extrabold text-xs flex items-center gap-1.5">
                    <Clock size={14} /> Viewing Timer: {memoryTimer}s
                  </span>
                  <button
                    onClick={() => setMemoryPhase('recalling')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    I Am Ready to Recall
                  </button>
                </div>
              )}
            </div>

            {/* Phase 1: Viewing Objects */}
            {memoryPhase === 'viewing' && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 text-center space-y-5">
                <p className="text-xs text-indigo-200 font-bold max-w-lg mx-auto">
                  Look closely at these 8 traditional courtyard items together. Remember as many as you can before time runs out!
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  {memoryTargets.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-800/90 border border-indigo-400/30 text-center shadow-md">
                      <span className="text-3xl block mb-1">{item.split(' ')[0]}</span>
                      <span className="text-xs font-extrabold text-white">{item.split(' ').slice(1).join(' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase 2: Recall & Selection */}
            {memoryPhase === 'recalling' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="text-base font-black text-white">Which items were in the courtyard?</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
                    Tap to select the items you remember ({selectedRecallItems.length} selected):
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
                  {memoryCandidates.map((item, idx) => {
                    const isSelected = selectedRecallItems.includes(item);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleRecallItem(item)}
                        className={`p-3.5 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-300 shadow-lg scale-105'
                            : 'bg-slate-800 border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{item.split(' ')[0]}</span>
                        <span className="text-xs font-bold block">{item.split(' ').slice(1).join(' ')}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={submitMemoryRecall}
                    disabled={selectedRecallItems.length === 0}
                    className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl disabled:opacity-40"
                  >
                    Submit Recalled Items
                  </button>
                </div>
              </div>
            )}

            {/* Phase 3: Instant Feedback */}
            {memoryPhase === 'feedback' && memoryScore && (
              <div className="p-6 rounded-2xl bg-slate-800/90 border border-emerald-500/40 text-center space-y-4 animate-in zoom-in-95">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-black">
                  🎉
                </div>
                <h4 className="text-xl font-black text-white">
                  Great Recall, {currentParticipant.display_name || currentParticipant.name}!
                </h4>
                <p className="text-sm font-bold text-emerald-300">
                  Identified {memoryScore.hits} of {memoryScore.total} items correctly ({memoryScore.accuracy}% accuracy)
                </p>
                <div className="flex justify-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-700">
                    Pass the device to {nextParticipant?.display_name || nextParticipant?.name} for their turn!
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ACTIVITY 2: SEQUENCE RELAY (COGNITIVE GROUP) */}
        {/* ---------------------------------------------------- */}
        {sessionData.activity_type === 'sequence_relay' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Cognitive Group Activity
                </span>
                <h3 className="text-base font-extrabold text-white mt-1 flex items-center gap-2">
                  <ListOrdered size={18} className="text-emerald-400" /> Sequence Relay: {sequenceTasks[currentTaskIndex].title}
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-400 font-medium mt-0.5">
                  The recipe/routine steps below are shuffled. Use ▲ and ▼ to arrange them in the proper chronological order.
                </p>
              </div>

              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-400 shrink-0">
                Moves: <span className="text-white font-black">{sequenceMoves}</span> • Attempts: <span className="text-white font-black">{sequenceAttempts}</span>
              </div>
            </div>

            <div className="space-y-3 max-w-xl mx-auto">
              {sequenceItems.map((step, idx) => {
                const isWrong = sequenceSubmitted && !sequenceCorrect && wrongPositions.includes(idx);
                const isRight = sequenceSubmitted && !sequenceCorrect && !wrongPositions.includes(idx);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-md ${
                      sequenceCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : isWrong
                        ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/40'
                        : isRight
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-black text-[10px] uppercase tracking-wider">
                          Position {idx + 1}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{step}</span>
                        {isWrong && (
                          <span className="text-[10px] font-bold text-amber-400 block mt-0.5">
                            ⚠️ Needs adjustment
                          </span>
                        )}
                        {isRight && (
                          <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">
                            ✓ In correct spot
                          </span>
                        )}
                      </div>
                    </div>

                    {!sequenceCorrect && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => swapSequenceItems(idx, idx - 1)}
                          disabled={idx === 0}
                          className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-xs font-black disabled:opacity-20 flex items-center justify-center border border-slate-600"
                          title="Move step up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => swapSequenceItems(idx, idx + 1)}
                          disabled={idx === sequenceItems.length - 1}
                          className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-xs font-black disabled:opacity-20 flex items-center justify-center border border-slate-600"
                          title="Move step down"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {sequenceSubmitted && (
              <div className={`p-5 rounded-2xl text-center text-xs font-bold animate-in zoom-in-95 ${
                sequenceCorrect ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-100' : 'bg-amber-950/90 border border-amber-500/60 text-amber-200'
              }`}>
                {sequenceCorrect ? (
                  <div className="space-y-1">
                    <span className="flex items-center justify-center gap-2 text-base font-black text-emerald-300">
                      <CheckCircle2 size={20} /> Perfect sequence! All steps are in correct chronological order.
                    </span>
                    <p className="text-xs text-emerald-200 font-medium">
                      Solved in {sequenceMoves} moves and {sequenceAttempts} attempt(s). You can now advance to the next participant.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="font-extrabold text-amber-300 block">
                      Not quite in order yet. {wrongPositions.length} position(s) need adjusting.
                    </span>
                    <p className="text-[11px] text-amber-200/90 font-medium">
                      Look at the highlighted amber positions and use the arrow buttons to swap them!
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button
                onClick={checkSequenceOrder}
                disabled={sequenceCorrect}
                className={`px-8 py-3 rounded-2xl font-extrabold text-sm shadow-xl transition-all ${
                  sequenceCorrect
                    ? 'bg-emerald-700 text-white opacity-80 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer hover:shadow-indigo-500/25'
                }`}
              >
                {sequenceCorrect ? 'Sequence Verified ✓' : 'Check Sequence Order'}
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ACTIVITY 3: GROUP VISUAL PUZZLE (COGNITIVE GROUP) */}
        {/* ---------------------------------------------------- */}
        {sessionData.activity_type === 'group_puzzle' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  Cognitive Group Activity
                </span>
                <h3 className="text-base font-extrabold text-white mt-1 flex items-center gap-2">
                  <Puzzle size={18} className="text-cyan-400" /> Group Visual Puzzle: Traditional Pattern
                </h3>
              </div>

              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-400">
                Moves: <span className="text-white">{puzzleMoves}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 text-center font-medium max-w-md mx-auto">
              Tap a tile, then tap another tile to swap their positions until the 9-motif pattern is assembled correctly.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {puzzleGrid.map((tileNum, idx) => {
                const isSelected = puzzleSelectedIdx === idx;
                const isCorrectSpot = tileNum === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handlePuzzleTileClick(idx)}
                    className={`aspect-square p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-cyan-600 border-cyan-300 ring-4 ring-cyan-400/50 shadow-xl scale-105'
                        : isCorrectSpot
                        ? 'bg-slate-800/90 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-3xl block mb-1">{puzzleMotifs[tileNum].split(' ')[0]}</span>
                    <span className="text-[10px] font-bold block">{puzzleMotifs[tileNum].split(' ').slice(1).join(' ')}</span>
                  </button>
                );
              })}
            </div>

            {puzzleSolved && (
              <div className="p-5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-center space-y-2 animate-in zoom-in-95">
                <h4 className="text-base font-black text-emerald-300">🎉 Visual Pattern Fully Assembled!</h4>
                <p className="text-xs text-emerald-200">Excellent spatial puzzle solving in {puzzleMoves} moves.</p>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ACTIVITY 4: STORY CHAIN (SOCIAL ENGAGEMENT) */}
        {/* ---------------------------------------------------- */}
        {sessionData.activity_type === 'story_chain' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                Social Engagement Activity • No Cognitive Scoring
              </span>
              <h3 className="text-base font-extrabold text-white mt-1 flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" /> Collaborative Story Chain
              </h3>
            </div>

            {/* Story History Chain */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 max-h-60 overflow-y-auto">
              {storyChainLines.map((line, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <span className="font-extrabold text-purple-400 block mb-0.5">{line.author}:</span>
                  <p className="text-slate-200 font-medium leading-relaxed">"{line.text}"</p>
                </div>
              ))}
            </div>

            {/* Add Next Sentence Input */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentParticipant.display_name || currentParticipant.name}'s Contribution (What happens next?):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStoryInput}
                  onChange={(e) => setNewStoryInput(e.target.value)}
                  placeholder="e.g. And then the children ran to the courtyard to watch the fireworks..."
                  className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAddStorySentence}
                  disabled={!newStoryInput.trim()}
                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs disabled:opacity-40"
                >
                  Add Sentence
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ACTIVITY 5: CONVERSATION CIRCLE (SOCIAL ENGAGEMENT) */}
        {/* ---------------------------------------------------- */}
        {sessionData.activity_type === 'conversation_circle' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  Social Engagement Activity • No Cognitive Scoring
                </span>
                <h3 className="text-base font-extrabold text-white mt-1 flex items-center gap-2">
                  <MessageSquare size={18} className="text-amber-400" /> Conversation Circle
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsConvTimerActive(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-amber-300 border border-slate-700 flex items-center gap-1"
                >
                  <Clock size={14} /> {isConvTimerActive ? 'Pause' : 'Start'} Timer ({convTimer}s)
                </button>
              </div>
            </div>

            {/* Conversation Theme Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-orange-950/60 border border-amber-500/30 space-y-4">
              <h4 className="text-xl sm:text-2xl font-black text-white text-center leading-snug">
                "{conversationPrompts[0].mainPrompt}"
              </h4>

              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                  Facilitator Follow-Up Prompts:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {conversationPrompts[0].subPrompts.map((sub, sidx) => (
                    <div key={sidx} className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20 text-slate-200">
                      {sub}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete Conversation Turn Checkbox */}
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white block">
                  Has {currentParticipant.display_name || currentParticipant.name} shared their memory?
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-400 font-medium">
                  Mark shared memory to record participation for this senior.
                </span>
              </div>

              <button
                onClick={() => {
                  setConvSharedCheck(prev => ({ ...prev, [currentParticipant.id]: true }));
                  markTurnComplete('conversation_circle', { shared_memory: true });
                }}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all ${
                  isTurnCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <CheckSquare size={16} />
                <span>{isTurnCompleted ? 'Memory Shared ✓' : 'Mark Shared & Done'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Participant Quick Selector & Facilitator Note */}
      <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-400">All Participants:</span>
          {participants.map((p, index) => {
            const isTurnDone = !!completedTurns[p.id];
            return (
              <button
                key={p.id}
                onClick={() => setActiveTurnIndex(index)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  index === activeTurnIndex
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md'
                    : 'bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{p.display_name || p.name}</span>
                {isTurnDone && <Check size={12} className="text-emerald-400" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder={`Observation note for ${currentParticipant.display_name || currentParticipant.name}...`}
            value={participantNotes[currentParticipant.id] || ''}
            onChange={(e) => setParticipantNotes({ ...participantNotes, [currentParticipant.id]: e.target.value })}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-xs font-medium text-white border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-72"
          />
        </div>
      </div>
    </div>
  );
}
