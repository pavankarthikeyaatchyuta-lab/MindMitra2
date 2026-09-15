import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n';

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
}

const CELESTIAL_EMOJIS = [
  '⭐', '🌙', '☀️', '🌺', '🍎', '🏠', '🕊️', '🔔', '🦋', '🎨',
  '💧', '🎵', '🌿', '🍇', '⛵', '🌈', '🌻', '🏮', '💎', '🍵'
];

const getPairCount = (difficulty: number) => {
  switch (difficulty) {
    case 1: return 3; // 6 cards (3x2)
    case 2: return 5; // 10 cards (5x2)
    case 3: return 6; // 12 cards
    case 4: return 8; // 16 cards
    default: return 5;
  }
};

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryMatch({ difficulty, userId, gameSessionId, onComplete }: GameProps) {
  const { t } = useTranslation();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const stats = useRef({
    flips: 0,
    matches: 0,
    errors: 0,
    repeatErrors: 0,
    corrections: 0,
    responseTimes: [] as number[],
    startTime: 0,
    lastActionTime: 0,
    seenCards: new Set<string>()
  });

  const pairCount = getPairCount(difficulty);

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
      seenCards: new Set<string>()
    };
  };

  const handleCardClick = (idx: number) => {
    if (isLocked || cards[idx].isFlipped || cards[idx].isMatched) return;

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
    setIsComplete(true);
    const now = Date.now();
    const totalTime = now - stats.current.startTime;
    const avgRt = stats.current.responseTimes.length > 0
      ? stats.current.responseTimes.reduce((a, b) => a + b, 0) / stats.current.responseTimes.length
      : 2000;

    const accuracy = stats.current.matches / Math.max(1, stats.current.matches + stats.current.errors);

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

        <div className="flex items-center gap-4">
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

      {/* Card Grid */}
      <div
        className={`grid gap-3.5 w-full justify-center ${
          pairCount <= 4
            ? 'grid-cols-3 sm:grid-cols-3'
            : pairCount <= 6
            ? 'grid-cols-3 sm:grid-cols-4'
            : 'grid-cols-4 sm:grid-cols-4'
        }`}
      >
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(idx)}
            disabled={card.isFlipped || card.isMatched || isLocked}
            className={`h-24 sm:h-28 w-full rounded-2xl flex items-center justify-center text-4xl sm:text-5xl transition-all duration-200 shadow-xs ${
              card.isMatched
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
