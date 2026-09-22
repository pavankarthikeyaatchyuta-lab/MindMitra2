import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { VoiceService } from '../services/voiceService';
import { InstructionService } from '../services/instructionService';
import { Lightbulb, ArrowRight, Eye } from 'lucide-react';

export interface GameMetrics {
  accuracy: number;
  avg_response_time_ms: number | null;
  repeat_errors: number;
  corrections: number;
  completion_time_ms: number | null;
  total_events: number;
  study_duration_ms?: number | null;
  first_interaction_latency_ms?: number | null;
  mismatches?: number;
  response_times?: number[];
  hesitation_count?: number;
  hesitation_duration_ms?: number;
  max_hesitation_ms?: number;
}

export interface GameProps {
  difficulty: number;
  userId: number;
  gameSessionId: number;
  onComplete: (metrics: GameMetrics) => void;
  hintTrigger?: number;
  onProvideCustomHint?: (hint: string) => void;
}

const CELESTIAL_EMOJIS = [
  '⭐', '🌙', '☀️', '🌺', '🍎', '🏠', '🕊️', '🔔', '🦋', '🎨',
  '💧', '🎵', '🌿', '🍇', '⛵', '🌈', '🌻', '🏮', '💎', '🍵'
];

const getPairCount = (difficulty: number) => {
  switch (difficulty) {
    case 1: return 3; // 6 cards (3x2)
    case 2: return 4; // 8 cards (4x2 or 2x4)
    case 3: return 6; // 12 cards (4x3)
    case 4: return 8; // 16 cards (4x4)
    default: return 4;
  }
};

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
  isHinted?: boolean;
}

export default function MemoryMatch({ difficulty, userId, gameSessionId, onComplete, hintTrigger, onProvideCustomHint }: GameProps) {
  const { t, language } = useTranslation();
  const [phase, setPhase] = useState<'study' | 'recall'>('study');
  const [studyRemaining, setStudyRemaining] = useState(7);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const idleTimerRef = useRef<any>(null);
  const studyTimerRef = useRef<any>(null);
  const lastHintTriggerRef = useRef(hintTrigger);

  const stats = useRef({
    phase: 'study' as 'study' | 'recall',
    flips: 0,
    matches: 0,
    errors: 0,
    repeatErrors: 0,
    corrections: 0,
    responseTimes: [] as number[],
    studyStartTime: 0,
    studyDuration: null as number | null,
    recallStartTime: 0,
    firstInteractionTime: 0,
    firstLatency: null as number | null,
    hesitationCount: 0,
    hesitationDurationMs: 0,
    maxHesitationMs: 0,
    lastActionTime: 0,
    seenCards: new Set<string>(),
    completed: false
  });

  const pairCount = getPairCount(difficulty);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!stats.current.completed && stats.current.phase === 'recall') {
        VoiceService.speakContext('memory_match', 'idle', language, false);
      }
    }, 14000);
  };

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (studyTimerRef.current) clearInterval(studyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    initGame();
  }, [difficulty, gameSessionId]);

  // Elapsed active recall timer
  useEffect(() => {
    let timer: any;
    if (!isComplete && phase === 'recall' && stats.current.recallStartTime > 0) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - stats.current.recallStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isComplete, phase]);

  const initGame = () => {
    if (studyTimerRef.current) clearInterval(studyTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    const selectedEmojis = CELESTIAL_EMOJIS.slice(0, pairCount);
    // Phase 1 (STUDY): Show all cards face-up
    const deck = [...selectedEmojis, ...selectedEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({
        id: idx,
        emoji,
        isFlipped: true, // Face-up during study
        isMatched: false
      }));

    setCards(deck);
    setFlippedIndices([]);
    setIsLocked(false);
    setIsComplete(false);
    setElapsedTime(0);
    setPhase('study');
    setStudyRemaining(7);

    const now = Date.now();
    stats.current = {
      phase: 'study',
      flips: 0,
      matches: 0,
      errors: 0,
      repeatErrors: 0,
      corrections: 0,
      responseTimes: [],
      studyStartTime: now,
      studyDuration: null as number | null,
      recallStartTime: 0,
      firstInteractionTime: 0,
      firstLatency: null as number | null,
      hesitationCount: 0,
      hesitationDurationMs: 0,
      maxHesitationMs: 0,
      lastActionTime: now,
      seenCards: new Set<string>(),
      completed: false
    };

    // Speak Phase 1 Study prompt: "Take a moment to remember where the matching cards are."
    const timerPrompt = setTimeout(() => {
      VoiceService.speakContext('memory_match', 'study', language, true);
    }, 400);

    // Run 7-second countdown for observation
    let countdown = 7;
    studyTimerRef.current = setInterval(() => {
      countdown -= 1;
      setStudyRemaining(countdown);
      if (countdown <= 0) {
        clearInterval(studyTimerRef.current);
        studyTimerRef.current = null;
        startRecallPhase();
      }
    }, 1000);

    return () => clearTimeout(timerPrompt);
  };

  const startRecallPhase = () => {
    if (studyTimerRef.current) {
      clearInterval(studyTimerRef.current);
      studyTimerRef.current = null;
    }
    if (stats.current.phase === 'recall') return;

    const now = Date.now();
    const actualStudyDuration = stats.current.studyStartTime > 0
      ? now - stats.current.studyStartTime
      : null;

    stats.current.phase = 'recall';
    stats.current.studyDuration = actualStudyDuration;
    stats.current.recallStartTime = now;
    stats.current.lastActionTime = now;

    // Phase 2 (RECALL): Flip all cards face-down
    setCards(prev => prev.map(c => ({ ...c, isFlipped: false, isMatched: false })));
    setFlippedIndices([]);
    setIsLocked(false);
    setPhase('recall');

    // Spoken prompt: "Ready? Let's find the matching pairs."
    VoiceService.speakContext('memory_match', 'recall_start', language, true);
    resetIdleTimer();
  };

  const triggerHint = () => {
    if (isComplete || isLocked) return;

    // In study phase, cards are already visible
    if (phase === 'study') {
      startRecallPhase();
      return;
    }

    // Find unmatched cards grouped by emoji
    const emojiMap = new Map<string, number[]>();
    cards.forEach((c, idx) => {
      if (!c.isMatched && !c.isFlipped) {
        const list = emojiMap.get(c.emoji) || [];
        list.push(idx);
        emojiMap.set(c.emoji, list);
      }
    });

    const targetIndices = Array.from(emojiMap.values()).find(indices => indices.length >= 2);
    if (!targetIndices || targetIndices.length < 2) return;

    const [idx1, idx2] = targetIndices;

    // Flip them briefly for 2.2 seconds
    setCards(prev => prev.map((c, i) => (i === idx1 || i === idx2 ? { ...c, isFlipped: true, isHinted: true } : c)));

    const hintMsg = language === 'te'
      ? `సూచన: ఈ రెండు కార్డులను చూడండి! (${cards[idx1]?.emoji || ''})`
      : language === 'hi'
      ? `सुझाव: इन दो कार्डों को एक पल के लिए देखें! (${cards[idx1]?.emoji || ''})`
      : `Hint: Take a peek at these two matching cards! (${cards[idx1]?.emoji || ''})`;

    if (onProvideCustomHint) {
      onProvideCustomHint(hintMsg);
    } else {
      VoiceService.speak(hintMsg, language, true);
    }

    setTimeout(() => {
      setCards(prev => prev.map((c, i) => (i === idx1 || i === idx2 ? { ...c, isFlipped: false, isHinted: false } : c)));
    }, 2200);
  };

  useEffect(() => {
    if (hintTrigger && hintTrigger !== lastHintTriggerRef.current) {
      lastHintTriggerRef.current = hintTrigger;
      triggerHint();
    }
  }, [hintTrigger]);

  const handleCardClick = (idx: number) => {
    // During study phase, card clicks do not trigger matches
    if (phase === 'study') return;
    if (isLocked || cards[idx].isFlipped || cards[idx].isMatched) return;

    resetIdleTimer();
    const now = Date.now();

    // Track latency to first card click in recall phase
    if (stats.current.firstInteractionTime === 0 && stats.current.recallStartTime > 0) {
      stats.current.firstInteractionTime = now;
      stats.current.firstLatency = now - stats.current.recallStartTime;
    }

    const rt = now - (stats.current.lastActionTime || now);
    stats.current.responseTimes.push(rt);

    // Track genuine hesitation: inter-tap intervals >= 2000ms
    if (rt >= 2000) {
      stats.current.hesitationCount++;
      stats.current.hesitationDurationMs += rt;
      stats.current.maxHesitationMs = Math.max(stats.current.maxHesitationMs, rt);
    }

    stats.current.lastActionTime = now;
    stats.current.flips++;

    const newCards = [...cards];
    newCards[idx].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, idx];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setIsLocked(true);
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      if (firstCard.emoji === secondCard.emoji) {
        stats.current.matches++;
        VoiceService.speakContext('memory_match', 'success', language, false);
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === firstIdx || i === secondIdx ? { ...c, isMatched: true } : c)));
          setFlippedIndices([]);
          setIsLocked(false);

          if (stats.current.matches === pairCount) {
            finishGame();
          }
        }, 500);
      } else {
        stats.current.errors++;
        VoiceService.speakContext('memory_match', 'incorrect', language, false);
        const cardKey = [firstCard.emoji, secondCard.emoji].sort().join('-');
        if (stats.current.seenCards.has(cardKey)) {
          stats.current.repeatErrors++;
        } else {
          stats.current.seenCards.add(cardKey);
        }

        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c)));
          setFlippedIndices([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  const finishGame = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (studyTimerRef.current) clearInterval(studyTimerRef.current);
    if (stats.current.completed) return;
    stats.current.completed = true;
    setIsComplete(true);

    const now = Date.now();
    const recallDuration = stats.current.recallStartTime > 0
      ? now - stats.current.recallStartTime
      : null;

    const avgRt = stats.current.responseTimes.length > 0
      ? stats.current.responseTimes.reduce((a, b) => a + b, 0) / stats.current.responseTimes.length
      : null;

    // Accuracy formula:
    // With study preview, repeat mismatches are the primary error signal.
    // An initial 1-mismatch exploration buffer ensures elders are not heavily penalized for orienting flips.
    const penalizableErrors = stats.current.repeatErrors + Math.max(0, stats.current.errors - 1);
    const accuracy = stats.current.matches / Math.max(1, stats.current.matches + penalizableErrors);

    onComplete({
      accuracy: Math.min(1.0, Math.max(0.0, accuracy)),
      avg_response_time_ms: avgRt !== null ? Math.round(avgRt) : null,
      response_times: stats.current.responseTimes,
      repeat_errors: stats.current.repeatErrors,
      corrections: stats.current.errors,
      completion_time_ms: recallDuration,
      total_events: stats.current.flips,
      study_duration_ms: stats.current.studyDuration,
      first_interaction_latency_ms: stats.current.firstInteractionTime > 0 ? stats.current.firstLatency : null,
      mismatches: stats.current.errors,
      hesitation_count: stats.current.hesitationCount,
      hesitation_duration_ms: stats.current.hesitationDurationMs,
      max_hesitation_ms: stats.current.maxHesitationMs,
    });
  };

  const matchesFound = cards.filter(c => c.isMatched).length / 2;

  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto py-2">
      {/* Header Info */}
      <div className="w-full card p-4 sm:p-5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🧠</span> {t('games.memory.title', 'Memory Match')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {phase === 'study'
              ? (language === 'te' ? 'కార్డుల స్థానాలను నిదానంగా గమనించండి.' : language === 'hi' ? 'कार्डों के स्थानों को ध्यानपूर्वक देखें।' : 'Take a moment to study card locations.')
              : t('games.memory.instructions', 'Flip the cards to match pairs of symbols.')}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {phase === 'recall' && (
            <button
              onClick={triggerHint}
              disabled={isLocked || isComplete}
              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 min-h-[38px]"
              title="Peek at a matching pair"
            >
              <Lightbulb size={15} className="text-amber-600 dark:text-amber-400" />
              <span>{language === 'te' ? 'సూచన (Hint)' : language === 'hi' ? 'सुझाव (Hint)' : 'Hint'}</span>
            </button>
          )}

          <div className="text-center px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 min-w-[70px]">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold">
              {phase === 'study' ? 'Study' : 'Pairs'}
            </span>
            <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {phase === 'study' ? `${studyRemaining}s` : `${matchesFound} / ${pairCount}`}
            </span>
          </div>

          <div className="text-center px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 min-w-[70px]">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold">
              {phase === 'study' ? 'Phase' : 'Time'}
            </span>
            <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
              {phase === 'study' ? '1 / 2' : `${elapsedTime}s`}
            </span>
          </div>
        </div>
      </div>

      {/* PHASE 1: STUDY BANNER & "I'M READY" CTA */}
      {phase === 'study' && (
        <div className="w-full mb-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border-2 border-indigo-200 dark:border-indigo-800 text-center sm:text-left shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  {language === 'te' ? 'దశ 1 — గమనించే సమయం (Study Phase)' : language === 'hi' ? 'चरण 1 — अध्ययन समय (Study Phase)' : 'Phase 1 — Study Observation'}
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {InstructionService.get('memory_match', 'study', language)}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3.5 py-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-700 text-xs font-black text-indigo-700 dark:text-indigo-300 shadow-xs flex items-center gap-1.5">
                <Eye size={14} />
                <span>{studyRemaining}s</span>
              </div>

              <button
                onClick={startRecallPhase}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-black text-sm shadow-md transition-all cursor-pointer flex items-center gap-2 min-h-[44px]"
              >
                <span>{InstructionService.getCommon('im_ready', language)}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: RECALL ACTIVE BANNER */}
      {phase === 'recall' && (
        <div className="w-full mb-4 px-4 py-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{InstructionService.get('memory_match', 'recall_start', language)}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
            Phase 2: Recall
          </span>
        </div>
      )}

      {/* Behavioral Sensor Telemetry Banner */}
      <div className="w-full mb-4 px-4 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-900 dark:text-white">Phone Sensor Active:</span>
          <span className="text-slate-500 dark:text-slate-400">
            {phase === 'study' ? 'Observing visual inspection pacing' : 'Observing touch cadence & interaction rhythm'}
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] font-mono text-slate-400">Level {difficulty}</span>
      </div>

      {/* Card Grid */}
      <div
        className={`grid gap-3.5 w-full justify-center ${
          pairCount <= 3
            ? 'grid-cols-3'
            : pairCount === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : pairCount <= 6
            ? 'grid-cols-3 sm:grid-cols-4'
            : 'grid-cols-4'
        }`}
      >
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(idx)}
            disabled={phase === 'study' || card.isMatched || (phase === 'recall' && (card.isFlipped || isLocked))}
            aria-label={card.isFlipped ? `Card ${card.emoji}` : 'Hidden card'}
            className={`h-24 sm:h-28 w-full rounded-2xl flex items-center justify-center text-4xl sm:text-5xl transition-all duration-200 shadow-xs ${
              phase === 'study'
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-200/40 dark:ring-indigo-800/40 cursor-default'
                : card.isHinted
                ? 'bg-amber-50 dark:bg-amber-950/70 border-3 border-amber-400 ring-4 ring-amber-400/50 shadow-lg text-amber-800 dark:text-amber-200 animate-pulse'
                : card.isMatched
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                : card.isFlipped
                ? 'bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer text-slate-300 dark:text-slate-600'
            }`}
          >
            {card.isFlipped || card.isMatched ? (
              <span>{card.emoji}</span>
            ) : (
              <span className="text-xl">?</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
