import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { CheckCircle2, XCircle, ShieldCheck, Info } from 'lucide-react';
import { api } from '../services/api';
import { FamiliarPerson } from '../types';

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

interface QuestionItem {
  id: string;
  type: 'object' | 'person';
  question: string;
  targetEmojiOrPhoto: string;
  isPhotoUrl?: boolean;
  personId?: number;
  options: {
    id: string;
    display: string;
    isCorrect: boolean;
  }[];
}

const LEVEL_1_QUESTIONS: QuestionItem[] = [
  {
    id: 'obj-1',
    type: 'object',
    question: 'Which one is the Apple?',
    targetEmojiOrPhoto: '🍎',
    options: [
      { id: '1a', display: '🍎', isCorrect: true },
      { id: '1b', display: '🪑', isCorrect: false },
      { id: '1c', display: '⏰', isCorrect: false },
    ]
  },
  {
    id: 'obj-2',
    type: 'object',
    question: 'Which one is the Chair?',
    targetEmojiOrPhoto: '🪑',
    options: [
      { id: '2a', display: '☕', isCorrect: false },
      { id: '2b', display: '🪑', isCorrect: true },
      { id: '2c', display: '🍌', isCorrect: false },
    ]
  },
  {
    id: 'obj-3',
    type: 'object',
    question: 'Which one is the Cup of Tea?',
    targetEmojiOrPhoto: '☕',
    options: [
      { id: '3a', display: '🕯️', isCorrect: false },
      { id: '3b', display: '👓', isCorrect: false },
      { id: '3c', display: '☕', isCorrect: true },
    ]
  }
];

const LEVEL_2_QUESTIONS: QuestionItem[] = [
  {
    id: 'obj-4',
    type: 'object',
    question: 'Which one is the Apple?',
    targetEmojiOrPhoto: '🍎',
    options: [
      { id: '4a', display: '🍅', isCorrect: false },
      { id: '4b', display: '🍎', isCorrect: true },
      { id: '4c', display: '🔴', isCorrect: false },
      { id: '4d', display: '🍊', isCorrect: false }
    ]
  },
  {
    id: 'obj-5',
    type: 'object',
    question: 'Which one is the Teapot?',
    targetEmojiOrPhoto: '🫖',
    options: [
      { id: '5a', display: '☕', isCorrect: false },
      { id: '5b', display: '🫖', isCorrect: true },
      { id: '5c', display: '🥛', isCorrect: false },
      { id: '5d', display: '🥤', isCorrect: false }
    ]
  },
  {
    id: 'obj-6',
    type: 'object',
    question: 'Which one is the Clock?',
    targetEmojiOrPhoto: '⏰',
    options: [
      { id: '6a', display: '⌚', isCorrect: false },
      { id: '6b', display: '⏱️', isCorrect: false },
      { id: '6c', display: '⏰', isCorrect: true },
      { id: '6d', display: '🔔', isCorrect: false }
    ]
  },
  {
    id: 'obj-7',
    type: 'object',
    question: 'Which one is the House / Home?',
    targetEmojiOrPhoto: '🏠',
    options: [
      { id: '7a', display: '🏢', isCorrect: false },
      { id: '7b', display: '🏠', isCorrect: true },
      { id: '7c', display: '🛖', isCorrect: false },
      { id: '7d', display: '⛪', isCorrect: false }
    ]
  }
];

export default function ObjectRecognition({ difficulty, userId, gameSessionId, onComplete }: GameProps) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [familiarStatus, setFamiliarStatus] = useState<string | null>(null);

  const stats = useRef({
    correctAnswers: 0,
    errors: 0,
    repeatConfusion: 0,
    corrections: 0,
    responseTimes: [] as number[],
    startTime: 0,
    lastActionTime: 0
  });

  useEffect(() => {
    initQuestions();
  }, [difficulty, userId, gameSessionId]);

  const initQuestions = async () => {
    let familiarPeople: FamiliarPerson[] = [];
    try {
      familiarPeople = await api.getFamiliarPeople(userId);
    } catch {
      familiarPeople = [];
    }

    const consented = familiarPeople.filter(p => p.consent_confirmed && p.photo_url);

    const baseQuestions: QuestionItem[] = difficulty === 1
      ? [...LEVEL_1_QUESTIONS]
      : [...LEVEL_2_QUESTIONS];

    if (consented.length >= 1) {
      setFamiliarStatus(null);
      const targetPerson = consented[0];
      const otherNames = ['Radha', 'Kiran', 'Suresh', 'Anita', 'Sunita', 'Rajesh'].filter(n => n !== targetPerson.name);

      const distractor1 = otherNames[0] || 'Friend';
      const distractor2 = otherNames[1] || 'Neighbor';
      const distractor3 = otherNames[2] || 'Cousin';

      const personQ: QuestionItem = {
        id: `person-${targetPerson.id}`,
        type: 'person',
        question: 'Who is in this photo?',
        targetEmojiOrPhoto: targetPerson.photo_url,
        isPhotoUrl: true,
        personId: targetPerson.id,
        options: [
          { id: 'p1', display: targetPerson.name, isCorrect: true },
          { id: 'p2', display: distractor1, isCorrect: false },
          { id: 'p3', display: distractor2, isCorrect: false },
          { id: 'p4', display: distractor3, isCorrect: false },
        ].sort(() => Math.random() - 0.5)
      };

      baseQuestions.splice(1, 0, personQ);
    } else {
      setFamiliarStatus('Standard household items active.');
    }

    setQuestions(baseQuestions);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setFeedback(null);
    setIsLocked(false);

    stats.current = {
      correctAnswers: 0,
      errors: 0,
      repeatConfusion: 0,
      corrections: 0,
      responseTimes: [],
      startTime: Date.now(),
      lastActionTime: Date.now()
    };
  };

  const handleSelectOption = (option: { id: string; display: string; isCorrect: boolean }) => {
    if (isLocked) return;

    const now = Date.now();
    const rt = now - (stats.current.lastActionTime || now);
    stats.current.responseTimes.push(rt);
    stats.current.lastActionTime = now;

    setSelectedOptionId(option.id);
    setIsLocked(true);

    if (option.isCorrect) {
      stats.current.correctAnswers++;
      setFeedback('correct');
      setTimeout(() => advanceQuestion(), 1200);
    } else {
      stats.current.errors++;
      setFeedback('incorrect');
      setTimeout(() => advanceQuestion(), 1600);
    }
  };

  const advanceQuestion = () => {
    setSelectedOptionId(null);
    setFeedback(null);
    setIsLocked(false);
    stats.current.lastActionTime = Date.now();

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    const now = Date.now();
    const totalTime = now - stats.current.startTime;
    const avgRt = stats.current.responseTimes.length > 0
      ? stats.current.responseTimes.reduce((a, b) => a + b, 0) / stats.current.responseTimes.length
      : 2100;

    const totalEvents = stats.current.correctAnswers + stats.current.errors;
    const accuracy = stats.current.correctAnswers / Math.max(1, totalEvents);

    onComplete({
      accuracy: Math.min(1.0, Math.max(0.1, accuracy)),
      avg_response_time_ms: avgRt,
      repeat_errors: stats.current.repeatConfusion,
      corrections: stats.current.corrections,
      completion_time_ms: totalTime,
      total_events: totalEvents
    });
  };

  if (questions.length === 0) {
    return (
      <div className="card p-12 text-center text-slate-700 dark:text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Preparing recognition activity...
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="flex flex-col items-center max-w-3xl mx-auto py-2">
      {/* Header */}
      <div className="w-full card p-5 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🔍</span> Object & Familiar Recognition
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {currentQ.type === 'person'
              ? 'Observe the photograph and identify the familiar person.'
              : 'Choose the image that answers the question.'}
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 font-bold text-sm">
          {currentIndex + 1} / {questions.length}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="w-full card p-6 sm:p-8 flex flex-col items-center">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-6 text-center max-w-xl">
          {currentQ.question}
        </h3>

        {/* Familiar Person Photo */}
        {currentQ.type === 'person' && (
          <div className="flex flex-col items-center mb-6">
            <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-sm bg-slate-100 flex items-center justify-center">
              <img
                src={currentQ.targetEmojiOrPhoto}
                alt="Familiar Person"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              <ShieldCheck size={13} className="text-emerald-500" />
              Private caregiver photograph
            </div>
          </div>
        )}

        {/* Options Grid */}
        <div
          className={`w-full max-w-xl grid gap-4 ${
            currentQ.type === 'person' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {currentQ.options.map(option => {
            const isSelected = selectedOptionId === option.id;

            let cardStyle = 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-900 dark:text-white';
            if (isSelected) {
              if (feedback === 'correct') {
                cardStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300';
              } else if (feedback === 'incorrect') {
                cardStyle = 'bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-700 dark:text-rose-300';
              }
            }

            return (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option)}
                disabled={isLocked}
                className={`p-5 rounded-2xl flex flex-col items-center justify-center transition-all min-h-[110px] cursor-pointer shadow-xs ${cardStyle}`}
              >
                {currentQ.type === 'person' ? (
                  <span className="text-lg font-bold">{option.display}</span>
                ) : (
                  <span className="text-5xl sm:text-6xl">{option.display}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Bar */}
        <div className="h-8 mt-5 flex items-center justify-center">
          <AnimatePresence>
            {feedback === 'correct' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg"
              >
                <CheckCircle2 size={20} /> Correct!
              </motion.div>
            )}
            {feedback === 'incorrect' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-lg"
              >
                <XCircle size={20} /> Good try!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
