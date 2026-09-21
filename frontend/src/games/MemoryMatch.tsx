import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n';
import { VoiceService } from '../services/voiceService';
import { Lightbulb } from 'lucide-react';

export interface GameMetrics {
  accuracy: number;
  avg_response_time_ms: number;
  repeat_errors: number;
  corrections: number;
  completion_time_ms: number;
  total_events: number;
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
    case 2: return 4; // 8 cards (4x2 on tablet/desktop, 2x4 on mobile)
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
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const idleTimerRef = useRef<any>(null);
  const lastHintTriggerRef = useRef(hintTrigger);

  const stats = useRef({
    flips: 0,
    matches: 0,
    errors: 0,
    repeatErrors: 0,
    corrections: 0,
    responseTimes: [] as number[],
    startTime: 0,
    lastActionTime: 0,
    seenCards: new Set<string>(),
    completed: false
  });

  const pairCount = getPairCount(difficulty);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!stats.current.completed) {
        VoiceService.speakContext('memory_match', 'idle', language, false);
      }
    }, 14000);
  };

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    initGame();
  }, [difficulty, gameSessionId]);

  useEffect(() => {
    let timer: any;
    if (!isComplete && stats.current.startTime > 0) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - stats.current.startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isComplete]);

  const initGame = () => {
    const selectedEmojis = CELESTIAL_EMOJIS.slice(0, pairCount);
    const deck = [...selectedEmojis, ...selectedEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({
        id: idx,
        emoji,
        isFlipped: false,
        isMatched: false
      }));

    setCards(deck);
    setFlippedIndices([]);
    setIsLocked(false);
    setIsComplete(false);
    setElapsedTime(0);

    stats.current = {
      flips: 0,
      matches: 0,
      errors: 0,
      repeatErrors: 0,
      corrections: 0,
      responseTimes: [],
      startTime: Date.now(),
      lastActionTime: Date.now(),
      seenCards: new Set<string>(),
      completed: false
    };
    resetIdleTimer();
  };

  const triggerHint = () => {
    if (isComplete || isLocked) return;

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

    // Flip them briefly for 2.2 seconds so player can see
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
    if (isLocked || cards[idx].isFlipped || cards[idx].isMatched) return;

    resetIdleTimer();
    const now = Date.now();
    const rt = now - (stats.current.lastActionTime || now);
    stats.current.responseTimes.push(rt);
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
    if (stats.current.completed) return;
    stats.current.completed = true;
    setIsComplete(true);
    const now = Date.now();
    const totalTime = now - stats.current.startTime;
    const avgRt = stats.current.responseTimes.length > 0
      ? stats.current.responseTimes.reduce((a, b) => a + b, 0) / stats.current.responseTimes.length
      : 2000;

    // In memory match, discovering card locations naturally requires exploratory flips.
    // We provide an exploration baseline buffer of (pairCount - 1) so normal discovery is not penalized as cognitive failure.
    const explorationBuffer = Math.max(1, pairCount - 1);
    const penalizableErrors = stats.current.repeatErrors + Math.max(0, stats.current.errors - explorationBuffer);
    const accuracy = stats.current.matches / Math.max(1, stats.current.matches + penalizableErrors);

    onComplete({
      accuracy: Math.min(1.0, Math.max(0.1, accuracy)),
      avg_response_time_ms: avgRt,
      repeat_errors: stats.current.repeatErrors,
      corrections: stats.current.corrections,
      completion_time_ms: totalTime,
      total_events: stats.current.flips
    });
  };

  const matchesFound = cards.filter(c => c.isMatched).length / 2;

  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto py-2">
      {/* Header Info */}
      <div className="w-full card p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🧠</span> {t('games.memory.title', 'Memory Match')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('games.memory.instructions', 'Flip the cards to match pairs of symbols.')}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={triggerHint}
            disabled={isLocked || isComplete}
            className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 min-h-[38px]"
            title="Peek at a matching pair"
          >
            <Lightbulb size={15} className="text-amber-600 dark:text-amber-400" />
            <span>{language === 'te' ? 'సూచన (Hint)' : language === 'hi' ? 'सुझाव (Hint)' : 'Hint'}</span>
          </button>

          <div className="text-center px-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold">Pairs Found</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{matchesFound} / {pairCount}</span>
          </div>

          <div className="text-center px-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold">Time</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{elapsedTime}s</span>
          </div>
        </div>
      </div>

      {/* Behavioral Sensor Telemetry Banner */}
      <div className="w-full mb-4 px-4 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-900 dark:text-white">Phone Sensor Active:</span>
          <span className="text-slate-500 dark:text-slate-400">Observing touch cadence & interaction rhythm</span>
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
            disabled={card.isFlipped || card.isMatched || isLocked}
            className={`h-24 sm:h-28 w-full rounded-2xl flex items-center justify-center text-4xl sm:text-5xl transition-all duration-200 shadow-xs ${
              card.isHinted
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
