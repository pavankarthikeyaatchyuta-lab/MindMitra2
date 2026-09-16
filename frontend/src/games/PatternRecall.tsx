import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

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

const SYMBOLS = ['★', '✦', '⬤', '▲', '◆', '☀️', '🌙', '🪐'];

interface RoundData {
  pattern: string[];
  options: {
    id: string;
    pattern: string[];
    isCorrect: boolean;
  }[];
}

export default function PatternRecall({ difficulty, userId, gameSessionId, onComplete }: GameProps) {
  const { t } = useTranslation();
  const patternLength = Math.min(5, difficulty + 1); // Level 1 = 2 symbols, Level 2 = 3, etc.
  const totalRounds = 3;
  // Distractors differ by more symbols at low difficulty (easier to spot)
  const swapCount = difficulty <= 2 ? 2 : 1;
  // Observation time scales with pattern length (6s for 2 symbols, up to 10s)
  const observeTime = Math.min(10, 4 + patternLength);

  const [stage, setStage] = useState<'memorize' | 'recall'>('memorize');
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [countdown, setCountdown] = useState(observeTime);

  const stats = useRef({
    correctRounds: 0,
    errors: 0,
    corrections: 0,
    responseTimes: [] as number[],
    startTime: 0,
    lastActionTime: 0
  });

  useEffect(() => {
    initGame();
  }, [difficulty, gameSessionId]);

  useEffect(() => {
    let timer: any;
    if (stage === 'memorize' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [stage, countdown]);

  // Auto-start recall when countdown reaches 0
  useEffect(() => {
    if (stage === 'memorize' && countdown <= 0) {
      startRecall();
    }
  }, [countdown, stage]);

  const generateRounds = (): RoundData[] => {
    const generated: RoundData[] = [];
    for (let r = 0; r < totalRounds; r++) {
      const pattern: string[] = [];
      for (let i = 0; i < patternLength; i++) {
        pattern.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      }

      // Number of distractors: 2 at level 1 (3 total options), 3 at level 2+ (4 total options)
      const distractorCount = difficulty <= 1 ? 2 : 3;
      const distractors: string[][] = [];
      let safety = 0;
      while (distractors.length < distractorCount && safety < 100) {
        safety++;
        const altered = [...pattern];
        const indicesToSwap = new Set<number>();
        while (indicesToSwap.size < Math.min(swapCount, patternLength)) {
          indicesToSwap.add(Math.floor(Math.random() * patternLength));
        }
        for (const swapIdx of indicesToSwap) {
          const available = SYMBOLS.filter(s => s !== pattern[swapIdx]);
          altered[swapIdx] = available[Math.floor(Math.random() * available.length)];
        }

        const isDup = distractors.some(d => d.join('') === altered.join('')) || altered.join('') === pattern.join('');
        if (!isDup) {
          distractors.push(altered);
        }
      }

      const options = [
        { id: `opt-c-${r}`, pattern: [...pattern], isCorrect: true },
        ...distractors.map((d, dIdx) => ({ id: `opt-d-${r}-${dIdx}`, pattern: d, isCorrect: false }))
      ].sort(() => Math.random() - 0.5);

      generated.push({ pattern, options });
    }
    return generated;
  };

  const initGame = () => {
    const genRounds = generateRounds();
    setRounds(genRounds);
    setCurrentRoundIdx(0);
    setStage('memorize');
    setCountdown(observeTime);
    setSelectedOptionId(null);
    setFeedback(null);
    setIsLocked(false);

    stats.current = {
      correctRounds: 0,
      errors: 0,
      corrections: 0,
      responseTimes: [],
      startTime: Date.now(),
      lastActionTime: Date.now()
    };
  };

  const startRecall = () => {
    setStage('recall');
    stats.current.lastActionTime = Date.now();
  };

  const handleSelectOption = (option: { id: string; pattern: string[]; isCorrect: boolean }) => {
    if (isLocked) return;

    const now = Date.now();
    const rt = now - (stats.current.lastActionTime || now);
    stats.current.responseTimes.push(rt);
    stats.current.lastActionTime = now;

    setSelectedOptionId(option.id);
    setIsLocked(true);

    if (option.isCorrect) {
      stats.current.correctRounds++;
      setFeedback('correct');
      setTimeout(() => advanceRound(), 1200);
    } else {
      stats.current.errors++;
      setFeedback('incorrect');
      setTimeout(() => advanceRound(), 2200);
    }
  };

  const advanceRound = () => {
    setSelectedOptionId(null);
    setFeedback(null);
    setIsLocked(false);

    if (currentRoundIdx + 1 < rounds.length) {
      setCurrentRoundIdx(prev => prev + 1);
      setStage('memorize');
      setCountdown(observeTime);
      stats.current.lastActionTime = Date.now();
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    const now = Date.now();
    const totalTime = now - stats.current.startTime;
    const avgRt = stats.current.responseTimes.length > 0
      ? stats.current.responseTimes.reduce((a, b) => a + b, 0) / stats.current.responseTimes.length
      : 2300;

    const totalEvents = stats.current.correctRounds + stats.current.errors;
    const accuracy = stats.current.correctRounds / Math.max(1, totalEvents);

    onComplete({
      accuracy: Math.min(1.0, Math.max(0.1, accuracy)),
      avg_response_time_ms: avgRt,
      repeat_errors: 0,
      corrections: stats.current.corrections,
      completion_time_ms: totalTime,
      total_events: totalEvents
    });
  };

  if (rounds.length === 0) return null;

  const currentRound = rounds[currentRoundIdx];

  return (
    <div className="flex flex-col items-center max-w-3xl mx-auto py-2">
      {/* Header Info */}
      <div className="w-full card p-5 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>✨</span> Pattern Recall
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {stage === 'memorize'
              ? `Memorize the symbol pattern. Disappears in ${countdown}s`
              : 'Which sequence was displayed during the observation phase?'}
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 font-bold text-sm">
          Round {currentRoundIdx + 1} / {rounds.length}
        </div>
      </div>

      {/* Main Game Box */}
      <div className="w-full card p-6 sm:p-8 flex flex-col items-center">
        {stage === 'memorize' ? (
          /* Observation Phase */
          <div className="w-full flex flex-col items-center py-6">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-6">
              Observe Pattern ({countdown}s remaining)
            </span>

            <div className="flex flex-wrap items-center justify-center gap-3 p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              {currentRound.pattern.map((sym, idx) => (
                <div
                  key={idx}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white dark:bg-slate-800 border-2 border-blue-500 flex items-center justify-center text-3xl sm:text-4xl text-slate-900 dark:text-white shadow-xs"
                >
                  {sym}
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={startRecall}
                className="elderly-btn-primary text-sm py-2.5 px-6 rounded-xl inline-flex items-center gap-2"
              >
                <span>Ready to Recall</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Recall Phase */
          <div className="w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
              Which pattern was displayed?
            </h3>

            <div className="w-full max-w-xl flex flex-col gap-3">
              {currentRound.options.map(opt => {
                const isSelected = selectedOptionId === opt.id;

                let cardStyle = 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-900 dark:text-white';
                if (isSelected) {
                  if (feedback === 'correct') {
                    cardStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-400';
                  } else if (feedback === 'incorrect') {
                    cardStyle = 'bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-700 dark:text-rose-300';
                  }
                } else if (feedback === 'incorrect' && opt.isCorrect) {
                  cardStyle = 'bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500 border-dashed text-emerald-700 dark:text-emerald-300 animate-pulse';
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    disabled={isLocked}
                    className={`p-4 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs ${cardStyle}`}
                  >
                    {opt.pattern.map((sym, si) => (
                      <span key={si} className="text-2xl sm:text-3xl font-bold">
                        {sym}
                      </span>
                    ))}
                    {feedback === 'incorrect' && opt.isCorrect && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 ml-2">
                        Correct pattern
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="h-8 mt-5 flex items-center justify-center">
              {feedback === 'correct' && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                  <CheckCircle2 size={18} /> Pattern matched!
                </div>
              )}
              {feedback === 'incorrect' && (
                <div className="text-rose-600 dark:text-rose-400 font-bold text-base">
                  Good observation try! Correct pattern is shown above.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
