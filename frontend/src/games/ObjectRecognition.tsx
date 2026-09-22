import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { CheckCircle2, XCircle, ShieldCheck, Info, User, Eye, Camera, Image as ImageIcon, Lightbulb } from 'lucide-react';
import { api } from '../services/api';
import { FamiliarPerson } from '../types';
import { VoiceService } from '../services/voiceService';
import CameraRecallActivity from '../components/CameraRecallActivity';

export interface GameMetrics {
  accuracy: number;
  avg_response_time_ms: number | null;
  repeat_errors: number;
  corrections: number;
  completion_time_ms: number | null;
  total_events: number;
  response_times?: number[];
  first_interaction_latency_ms?: number | null;
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

interface Option {
  id: string;
  display: string;
  isCorrect: boolean;
}

interface QuestionItem {
  id: string;
  type: 'object' | 'person';
  question: string;
  targetEmojiOrPhoto: string;
  isPhotoUrl?: boolean;
  personId?: number;
  options: Option[];
}

const LEVEL_1_QUESTIONS: QuestionItem[] = [
  {
    id: 'obj-1',
    type: 'object',
    question: 'Which one is the Apple?',
    targetEmojiOrPhoto: '🍎',
    options: [
      { id: '1a', display: '🍌', isCorrect: false },
      { id: '1b', display: '🍎', isCorrect: true },
      { id: '1c', display: '🍇', isCorrect: false },
    ]
  },
  {
    id: 'obj-2',
    type: 'object',
    question: 'Which one is the Tea Cup?',
    targetEmojiOrPhoto: '🍵',
    options: [
      { id: '2a', display: '🍵', isCorrect: true },
      { id: '2b', display: '🥣', isCorrect: false },
      { id: '2c', display: '🍶', isCorrect: false },
    ]
  },
  {
    id: 'obj-3',
    type: 'object',
    question: 'Which one is the Car?',
    targetEmojiOrPhoto: '🚗',
    options: [
      { id: '3a', display: '🚲', isCorrect: false },
      { id: '3b', display: '🚌', isCorrect: false },
      { id: '3c', display: '🚗', isCorrect: true },
    ]
  }
];

const LEVEL_2_QUESTIONS: QuestionItem[] = [
  {
    id: 'obj-4',
    type: 'object',
    question: 'Which item is the Red Apple?',
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

export default function ObjectRecognition({ difficulty, userId, gameSessionId, onComplete, hintTrigger, onProvideCustomHint }: GameProps) {
  const { t, language } = useTranslation();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [familiarStatus, setFamiliarStatus] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [familiarList, setFamiliarList] = useState<FamiliarPerson[]>([]);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<string[]>([]);
  const [hintedOptionId, setHintedOptionId] = useState<string | null>(null);

  const idleTimerRef = useRef<any>(null);
  const lastHintTriggerRef = useRef(hintTrigger);

  const stats = useRef({
    correctAnswers: 0,
    errors: 0,
    repeatConfusion: 0,
    corrections: 0,
    responseTimes: [] as number[],
    startTime: 0,
    firstInteractionLatencyMs: null as number | null,
    hesitationCount: 0,
    hesitationDurationMs: 0,
    maxHesitationMs: 0,
    lastActionTime: 0
  });

  const triggerHint = () => {
    if (isLocked || !questions[currentIndex]) return;
    const curQ = questions[currentIndex];
    const wrongUneliminated = curQ.options.filter(o => !o.isCorrect && !eliminatedOptionIds.includes(o.id));

    if (wrongUneliminated.length > 0) {
      const toEliminate = wrongUneliminated[0].id;
      setEliminatedOptionIds(prev => [...prev, toEliminate]);

      const hintMsg = language === 'te'
        ? 'సూచన: ఒక తప్పు ఎంపికను తొలగించాము. మిగిలిన ఎంపికలను శ్రద్ధగా పరిశీలించండి!'
        : language === 'hi'
        ? 'सुझाव: हमने एक गलत विकल्प हटा दिया है। शेष विकल्पों को ध्यान से देखें!'
        : 'Hint: We eliminated one incorrect option for you. Look closely at the remaining choices!';

      if (onProvideCustomHint) onProvideCustomHint(hintMsg);
      else VoiceService.speak(hintMsg, language, true);
    } else {
      const correctOpt = curQ.options.find(o => o.isCorrect);
      if (correctOpt) {
        setHintedOptionId(correctOpt.id);
        const hintMsg = language === 'te'
          ? `సూచన: చిత్రం "${correctOpt.display}" కు సంబంధించింది.`
          : language === 'hi'
          ? `सुझाव: यह चित्र "${correctOpt.display}" से संबंधित है।`
          : `Hint: The picture is related to "${correctOpt.display}".`;
        if (onProvideCustomHint) onProvideCustomHint(hintMsg);
        else VoiceService.speak(hintMsg, language, true);
        setTimeout(() => setHintedOptionId(null), 4000);
      }
    }
  };

  useEffect(() => {
    if (hintTrigger && hintTrigger !== lastHintTriggerRef.current) {
      lastHintTriggerRef.current = hintTrigger;
      triggerHint();
    }
  }, [hintTrigger]);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      VoiceService.speakContext('object_recognition', 'idle', language, false);
    }, 14000);
  };

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

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
    setFamiliarList(consented);

    const baseQuestions: QuestionItem[] = difficulty === 1
      ? [...LEVEL_1_QUESTIONS]
      : [...LEVEL_2_QUESTIONS];

    if (consented.length >= 1) {
      setFamiliarStatus(null);
      const targetPerson = consented[Math.floor(Math.random() * consented.length)];
      const otherFamilyNames = consented.filter(p => p.id !== targetPerson.id).map(p => p.name);
      const fallbackNames = ['Radha Sharma', 'Kiran Verma', 'Suresh Patel', 'Pooja Gupta', 'Deepak Rao'].filter(n => n !== targetPerson.name && !otherFamilyNames.includes(n));
      const allDistractorNames = [...otherFamilyNames, ...fallbackNames];

      const distractor1 = allDistractorNames[0] || 'Friend';
      const distractor2 = allDistractorNames[1] || 'Neighbor';
      const distractor3 = allDistractorNames[2] || 'Cousin';

      const localizedQuestion = language === 'te'
        ? `ఈ ఫోటోలో ఉన్నది ఎవరు? (${targetPerson.relationship || 'కుటుంబ సభ్యులు'})`
        : language === 'hi'
        ? `इस तस्वीर में कौन हैं? (${targetPerson.relationship || 'परिवार के सदस्य'})`
        : `Who is in this photo? (${targetPerson.relationship || 'Family Member'})`;

      const personQ: QuestionItem = {
        id: `person-${targetPerson.id}`,
        type: 'person',
        question: localizedQuestion,
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
    setEliminatedOptionIds([]);
    setHintedOptionId(null);

    stats.current = {
      correctAnswers: 0,
      errors: 0,
      repeatConfusion: 0,
      corrections: 0,
      responseTimes: [] as number[],
      startTime: Date.now(),
      firstInteractionLatencyMs: null as number | null,
      hesitationCount: 0,
      hesitationDurationMs: 0,
      maxHesitationMs: 0,
      lastActionTime: Date.now()
    };
    resetIdleTimer();
  };

  const handleSelectOption = (option: Option) => {
    if (isLocked) return;

    resetIdleTimer();
    const now = Date.now();
    const rt = now - (stats.current.lastActionTime || now);
    if (stats.current.firstInteractionLatencyMs === null) {
      stats.current.firstInteractionLatencyMs = rt;
    }
    stats.current.responseTimes.push(rt);

    // Track inter-tap hesitation >= 2000ms
    if (rt >= 2000) {
      stats.current.hesitationCount++;
      stats.current.hesitationDurationMs += rt;
      stats.current.maxHesitationMs = Math.max(stats.current.maxHesitationMs, rt);
    }

    stats.current.lastActionTime = now;

    setSelectedOptionId(option.id);
    setIsLocked(true);

    if (option.isCorrect) {
      stats.current.correctAnswers++;
      VoiceService.speakContext('object_recognition', 'success', language, false);
      setFeedback('correct');
      setTimeout(() => advanceQuestion(), 1200);
    } else {
      stats.current.errors++;
      VoiceService.speakContext('object_recognition', 'incorrect', language, false);
      setFeedback('incorrect');
      setTimeout(() => advanceQuestion(), 1600);
    }
  };

  const advanceQuestion = () => {
    setSelectedOptionId(null);
    setFeedback(null);
    setIsLocked(false);
    setEliminatedOptionIds([]);
    setHintedOptionId(null);
    stats.current.lastActionTime = Date.now();
    resetIdleTimer();

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const now = Date.now();
    const totalTime = now - stats.current.startTime;
    const avgRt = stats.current.responseTimes.length > 0
      ? Math.round(stats.current.responseTimes.reduce((a, b) => a + b, 0) / stats.current.responseTimes.length)
      : null;

    const totalEvents = stats.current.correctAnswers + stats.current.errors;
    const accuracy = totalEvents > 0 ? (stats.current.correctAnswers / totalEvents) : 0;

    onComplete({
      accuracy: Math.min(1.0, Math.max(0.0, accuracy)),
      avg_response_time_ms: avgRt,
      response_times: stats.current.responseTimes,
      repeat_errors: stats.current.repeatConfusion,
      corrections: stats.current.corrections,
      completion_time_ms: totalTime,
      total_events: totalEvents,
      first_interaction_latency_ms: stats.current.firstInteractionLatencyMs,
      hesitation_count: stats.current.hesitationCount,
      hesitation_duration_ms: stats.current.hesitationDurationMs,
      max_hesitation_ms: stats.current.maxHesitationMs,
    });
  };

  const handleCameraComplete = (matchSuccess: boolean, latencyMs: number, _recallType?: 'self_confirmed' | 'assisted') => {
    stats.current.responseTimes.push(latencyMs);
    if (matchSuccess) {
      stats.current.correctAnswers++;
      VoiceService.speakContext('object_recognition', 'success', language, false);
    } else {
      stats.current.errors++;
      VoiceService.speakContext('object_recognition', 'incorrect', language, false);
    }
    setCameraMode(false);
    advanceQuestion();
  };

  if (cameraMode) {
    return (
      <div className="flex flex-col items-center max-w-3xl mx-auto py-2">
        <div className="w-full mb-3 flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Live Visual Recall Camera Mode</span>
          </div>
          <button
            onClick={() => setCameraMode(false)}
            className="elderly-btn-secondary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 rounded-xl"
          >
            <ImageIcon size={14} />
            <span>Switch to Photo Quiz</span>
          </button>
        </div>
        <CameraRecallActivity
          familiarPeopleList={familiarList}
          onComplete={handleCameraComplete}
          onCancel={() => setCameraMode(false)}
        />
      </div>
    );
  }

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

        <div className="flex items-center gap-2">
          <button
            onClick={triggerHint}
            type="button"
            disabled={isLocked}
            className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors cursor-pointer min-h-[36px]"
            title="Get a hint"
          >
            <Lightbulb size={14} className="text-amber-600 dark:text-amber-400" />
            <span>{language === 'te' ? 'సూచన (Hint)' : language === 'hi' ? 'सुझाव (Hint)' : 'Hint'}</span>
          </button>

          <button
            onClick={() => setCameraMode(true)}
            type="button"
            className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer min-h-[36px]"
            title="Switch to live camera recall observation"
          >
            <Camera size={14} />
            <span className="hidden sm:inline">Live Camera Mode</span>
            <span className="sm:hidden">Camera</span>
          </button>
          <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 font-bold text-sm min-h-[36px] flex items-center justify-center">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>
      </div>

      {/* Behavioral Sensor Telemetry Banner */}
      <div className="w-full mb-4 px-4 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-900 dark:text-white">Phone Sensor Active:</span>
          <span className="text-slate-500 dark:text-slate-400">Observing prompt recognition latency & touch rhythm</span>
        </div>
        <span className="hidden sm:inline text-[11px] font-mono text-slate-400">Level {difficulty}</span>
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
            currentQ.type === 'person'
              ? 'grid-cols-1 sm:grid-cols-2'
              : currentQ.options.length === 3
              ? 'grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          {currentQ.options.map(option => {
            const isSelected = selectedOptionId === option.id;
            const isEliminated = eliminatedOptionIds.includes(option.id);
            const isHinted = hintedOptionId === option.id;

            let cardStyle = 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-900 dark:text-white';
            if (isSelected) {
              if (feedback === 'correct') {
                cardStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300';
              } else if (feedback === 'incorrect') {
                cardStyle = 'bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-700 dark:text-rose-300';
              }
            } else if (feedback === 'incorrect' && option.isCorrect) {
              cardStyle = 'bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500 border-dashed text-emerald-700 dark:text-emerald-300 animate-pulse';
            } else if (isHinted) {
              cardStyle = 'bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 ring-4 ring-amber-400/50 text-amber-900 dark:text-amber-100 animate-pulse';
            } else if (isEliminated) {
              cardStyle = 'bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 opacity-25 pointer-events-none line-through';
            }

            return (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option)}
                disabled={isLocked || isEliminated}
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
