import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';

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

interface RoutineItem {
  id: string;
  emoji: string;
  label: string;
  originalIndex: number;
}

const ROUTINES = [
  {
    name: 'Morning Schedule',
    items: [
      { emoji: '🌅', label: 'Wake up' },
      { emoji: '🪥', label: 'Brush teeth' },
      { emoji: '🍳', label: 'Eat breakfast' },
      { emoji: '💊', label: 'Take medicine' },
      { emoji: '📰', label: 'Read newspaper' },
      { emoji: '🚶', label: 'Go for morning walk' },
      { emoji: '🍲', label: 'Have lunch' }
    ]
  },
  {
    name: 'Evening Schedule',
    items: [
      { emoji: '🏠', label: 'Return home' },
      { emoji: '🧼', label: 'Wash hands' },
      { emoji: '☕', label: 'Enjoy tea' },
      { emoji: '📺', label: 'Watch news' },
      { emoji: '🍽️', label: 'Eat dinner' },
      { emoji: '💊', label: 'Take night pills' },
      { emoji: '💤', label: 'Go to sleep' }
    ]
  },
  {
    name: 'Cooking Activity',
    items: [
      { emoji: '🥬', label: 'Wash vegetables' },
      { emoji: '🔪', label: 'Chop vegetables' },
      { emoji: '🫕', label: 'Heat the pan' },
      { emoji: '🧂', label: 'Add fresh spices' },
      { emoji: '🍛', label: 'Cook and simmer' },
      { emoji: '🍽️', label: 'Serve warm on plate' },
      { emoji: '🧹', label: 'Clean kitchen counter' }
    ]
  }
];

export default function DailyRoutine({ difficulty, userId, gameSessionId, onComplete }: GameProps) {
  const { t } = useTranslation();
  
  const [stage, setStage] = useState<'memorize' | 'recall'>('memorize');
  const [targetSequence, setTargetSequence] = useState<RoutineItem[]>([]);
  const [poolItems, setPoolItems] = useState<RoutineItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<RoutineItem[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const stats = useRef({
    correctPlacements: 0,
    errors: 0,
    corrections: 0,
    responseTimes: [] as number[],
    startTime: 0,
    lastActionTime: 0
  });

  const itemCount = Math.min(6, difficulty + 2);

  useEffect(() => {
    initGame();
  }, [difficulty, gameSessionId]);

  const initGame = () => {
    const routine = ROUTINES[Math.floor(Math.random() * ROUTINES.length)];
    const chosenItems = routine.items.slice(0, itemCount).map((item, idx) => ({
      id: `item-${idx}`,
      emoji: item.emoji,
      label: item.label,
      originalIndex: idx
    }));

    setTargetSequence(chosenItems);
    setPoolItems([...chosenItems].sort(() => Math.random() - 0.5));
    setSelectedItems([]);
    setStage('memorize');
    setIsComplete(false);

    stats.current = {
      correctPlacements: 0,
      errors: 0,
      corrections: 0,
      responseTimes: [],
      startTime: Date.now(),
      lastActionTime: Date.now()
    };
  };

  const handleStartRecall = () => {
    setStage('recall');
    stats.current.lastActionTime = Date.now();
  };

  const [wrongItemId, setWrongItemId] = useState<string | null>(null);
  const [clickDebounce, setClickDebounce] = useState(false);

  const handleSelectPoolItem = (item: RoutineItem) => {
    if (clickDebounce) return;
    setClickDebounce(true);
    setTimeout(() => setClickDebounce(false), 400);

    const now = Date.now();
    const rt = now - (stats.current.lastActionTime || now);
    stats.current.responseTimes.push(rt);
    stats.current.lastActionTime = now;

    const nextIndex = selectedItems.length;

    if (item.originalIndex === nextIndex) {
      setWrongItemId(null);
      stats.current.correctPlacements++;
      const newSelected = [...selectedItems, item];
      setSelectedItems(newSelected);
      setPoolItems(prev => prev.filter(p => p.id !== item.id));

      if (newSelected.length === targetSequence.length) {
        finishGame(newSelected);
      }
    } else {
      stats.current.errors++;
      setWrongItemId(item.id);
      setTimeout(() => setWrongItemId(null), 1200);
    }
  };

  const handleUndo = () => {
    if (selectedItems.length === 0) return;
    stats.current.corrections++;
    const lastItem = selectedItems[selectedItems.length - 1];
    setSelectedItems(prev => prev.slice(0, -1));
    setPoolItems(prev => [...prev, lastItem]);
  };

  const finishGame = (finalSequence: RoutineItem[]) => {
    setIsComplete(true);
    const now = Date.now();
    const totalTime = now - stats.current.startTime;
    const avgRt = stats.current.responseTimes.length > 0
      ? stats.current.responseTimes.reduce((a, b) => a + b, 0) / stats.current.responseTimes.length
      : 2500;

    const totalAttempts = stats.current.correctPlacements + stats.current.errors;
    const accuracy = stats.current.correctPlacements / Math.max(1, totalAttempts);

    onComplete({
      accuracy: Math.min(1.0, Math.max(0.1, accuracy)),
      avg_response_time_ms: avgRt,
      repeat_errors: 0,
      corrections: stats.current.corrections,
      completion_time_ms: totalTime,
      total_events: totalAttempts
    });
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto py-2">
      {/* Header Info */}
      <div className="w-full card p-5 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📋</span> {t('games.routine.title', 'Daily Routine Recall')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {stage === 'memorize'
            ? 'Observe the natural sequence of daily tasks below. Click continue when ready.'
            : 'Rebuild the daily routine in the correct order from start to finish.'}
        </p>
      </div>

      {stage === 'memorize' ? (
        /* Memorize Stage */
        <div className="w-full space-y-4">
          <div className="card p-6 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4">
              Standard Daily Order
            </h3>

            <div className="space-y-2.5">
              {targetSequence.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3.5 shadow-xs"
                >
                  <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={handleStartRecall}
              className="elderly-btn-primary text-base py-3.5 px-8 rounded-xl inline-flex items-center gap-2 shadow-sm"
            >
              <span>I Remember, Start Sequence</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* Recall Stage */
        <div className="w-full space-y-6">
          {/* Constructed Sequence Box */}
          <div className="card p-6 min-h-[140px]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Reconstructed Sequence ({selectedItems.length}/{targetSequence.length})
              </span>
              {selectedItems.length > 0 && !isComplete && (
                <button
                  onClick={handleUndo}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>Undo</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {selectedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 flex items-center gap-3"
                >
                  <span className="w-6 h-6 rounded-md bg-emerald-200 dark:bg-emerald-800 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-xs sm:text-sm font-bold">{item.label}</span>
                  <CheckCircle2 size={16} className="ml-auto text-emerald-600 dark:text-emerald-400" />
                </div>
              ))}

              {selectedItems.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-700 dark:text-slate-400 italic">
                  Tap tasks below in order from first to last
                </div>
              )}
            </div>
          </div>

          {/* Item Options Pool */}
          {!isComplete && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-black dark:text-white uppercase tracking-wider block">
                  Choose Next Step:
                </span>
                {wrongItemId && (
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                    ⚠️ Not the next step in sequence — try again!
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {poolItems.map((item) => {
                  const isWrong = wrongItemId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectPoolItem(item)}
                      className={`p-3.5 rounded-xl border-2 text-left flex items-center gap-3 shadow-xs transition-all cursor-pointer ${
                        isWrong
                          ? 'bg-rose-100 dark:bg-rose-950 border-rose-500 text-rose-950 dark:text-rose-200 animate-bounce'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-blue-600 text-black dark:text-white'
                      }`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-xs sm:text-sm font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
