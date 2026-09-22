import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { Language } from '../types';
import { CheckCircle2, RotateCcw, Sparkles, Check, RefreshCw, Lightbulb } from 'lucide-react';
import { VoiceService } from '../services/voiceService';

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
  visual_metrics?: any;
}

export interface GameProps {
  difficulty: number;
  userId: number;
  gameSessionId: number;
  onComplete: (metrics: GameMetrics) => void;
  hintTrigger?: number;
  onProvideCustomHint?: (hint: string) => void;
}

interface RoutineTaskDef {
  id: string;
  emoji: string;
  labels: Record<Language, string>;
}

interface RoutineCategoryDef {
  id: string;
  names: Record<Language, string>;
  items: RoutineTaskDef[];
}

interface DisplayRoutineItem {
  id: string;
  emoji: string;
  label: string;
  originalIndex: number;
}

const ROUTINE_CATEGORIES: RoutineCategoryDef[] = [
  {
    id: 'morning',
    names: {
      en: 'Morning Schedule',
      te: 'ఉదయపు దినచర్య',
      hi: 'सुबह की दिनचर्या',
    },
    items: [
      { id: 'm1', emoji: '🌅', labels: { en: 'Wake up', te: 'మేల్కొనడం', hi: 'जागना' } },
      { id: 'm2', emoji: '🪥', labels: { en: 'Brush teeth', te: 'పళ్ళు తోముకోవడం', hi: 'ब्रश करना' } },
      { id: 'm3', emoji: '🍳', labels: { en: 'Eat breakfast', te: 'అల్పాహారం తినడం', hi: 'नाश्ता करना' } },
      { id: 'm4', emoji: '💊', labels: { en: 'Take medicine', te: 'మందులు వేసుకోవడం', hi: 'दवा लेना' } },
      { id: 'm5', emoji: '📰', labels: { en: 'Read newspaper', te: 'వార్తాపత్రిక చదవడం', hi: 'अखबार पढ़ना' } },
      { id: 'm6', emoji: '🚶', labels: { en: 'Go for morning walk', te: 'ఉదయపు నడక', hi: 'सुबह की सैर' } },
      { id: 'm7', emoji: '🍲', labels: { en: 'Have lunch', te: 'మధ్యాహ్న భోజనం', hi: 'दोपहर का खाना' } },
    ],
  },
  {
    id: 'evening',
    names: {
      en: 'Evening Schedule',
      te: 'సాయంత్రం దినచర్య',
      hi: 'शाम की दिनचर्या',
    },
    items: [
      { id: 'e1', emoji: '🏠', labels: { en: 'Return home', te: 'ఇంటికి చేరుకోవడం', hi: 'घर लौटना' } },
      { id: 'e2', emoji: '🧼', labels: { en: 'Wash hands', te: 'చేతులు కడుక్కోవడం', hi: 'हाथ धोना' } },
      { id: 'e3', emoji: '☕', labels: { en: 'Enjoy tea', te: 'టీ తాగడం', hi: 'चाय पीना' } },
      { id: 'e4', emoji: '📺', labels: { en: 'Watch news', te: 'వార్తలు చూడటం', hi: 'समाचार देखना' } },
      { id: 'e5', emoji: '🍽️', labels: { en: 'Eat dinner', te: 'రాత్రి భోజనం', hi: 'रात का खाना' } },
      { id: 'e6', emoji: '💊', labels: { en: 'Take night pills', te: 'రాత్రి మందులు', hi: 'रात की गोलियां' } },
      { id: 'e7', emoji: '💤', labels: { en: 'Go to sleep', te: 'నిద్రపోవడం', hi: 'सोने जाना' } },
    ],
  },
  {
    id: 'cooking',
    names: {
      en: 'Cooking Activity',
      te: 'వంట పని',
      hi: 'खाना बनाना',
    },
    items: [
      { id: 'c1', emoji: '🥬', labels: { en: 'Wash vegetables', te: 'కూరగాయలు కడగడం', hi: 'सब्जियां धोना' } },
      { id: 'c2', emoji: '🔪', labels: { en: 'Chop vegetables', te: 'కూరగాయలు కోయడం', hi: 'सब्जियां काटना' } },
      { id: 'c3', emoji: '🫕', labels: { en: 'Heat the pan', te: 'బాణలి వేడి చేయడం', hi: 'पैन गर्म करना' } },
      { id: 'c4', emoji: '🧂', labels: { en: 'Add fresh spices', te: 'మసాలాలు కలపడం', hi: 'मसाले डालना' } },
      { id: 'c5', emoji: '🍛', labels: { en: 'Cook and simmer', te: 'ఉడికించడం', hi: 'पकाना' } },
      { id: 'c6', emoji: '🍽️', labels: { en: 'Serve warm on plate', te: 'ప్లేట్‌లో వడ్డించడం', hi: 'थाली में परोसना' } },
      { id: 'c7', emoji: '🧹', labels: { en: 'Clean kitchen counter', te: 'వంటగది శుభ్రం చేయడం', hi: 'रसोई साफ करना' } },
    ],
  },
];

export default function DailyRoutine({ difficulty, userId, gameSessionId, onComplete, hintTrigger, onProvideCustomHint }: GameProps) {
  const { t, language } = useTranslation();

  const [scheduleTitle, setScheduleTitle] = useState('');
  const [targetSequence, setTargetSequence] = useState<DisplayRoutineItem[]>([]);
  const [poolItems, setPoolItems] = useState<DisplayRoutineItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<DisplayRoutineItem[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [hintedItemId, setHintedItemId] = useState<string | null>(null);

  const idleTimerRef = useRef<any>(null);
  const lastHintTriggerRef = useRef(hintTrigger);

  const stats = useRef({
    firstInteractionLatencyMs: null as number | null,
    responseTimes: [] as number[],
    corrections: 0,
    hesitationCount: 0,
    hesitationDurationMs: 0,
    maxHesitationMs: 0,
    startTime: 0,
    lastActionTime: 0,
    completed: false,
  });

  const itemCount = Math.min(6, Math.max(3, difficulty + 2));

  const triggerHint = () => {
    if (isComplete) return;

    // Find the item that should go into the next slot
    const nextSlot = selectedItems.length;
    if (nextSlot < targetSequence.length) {
      const targetItem = targetSequence[nextSlot];
      setHintedItemId(targetItem.id);

      const hintMsg = language === 'te'
        ? `సూచన: తదుపరి పని "${targetItem.label}" (${targetItem.emoji}). క్రింది ఎంపికలలో దాన్ని ఎంచుకోండి!`
        : language === 'hi'
        ? `सुझाव: अगला कार्य "${targetItem.label}" (${targetItem.emoji}) है। नीचे दिए गए विकल्पों में से इसे चुनें!`
        : `Hint: The next task in the sequence is "${targetItem.label}" (${targetItem.emoji}). Tap it below to place in slot ${nextSlot + 1}!`;

      if (onProvideCustomHint) {
        onProvideCustomHint(hintMsg);
      } else {
        VoiceService.speak(hintMsg, language, true);
      }

      setTimeout(() => {
        setHintedItemId(null);
      }, 5000);
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
      if (!stats.current.completed) {
        VoiceService.speakContext('daily_routine', 'idle', language, false);
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
  }, [difficulty, gameSessionId, language]);

  const initGame = () => {
    // Pick routine category
    const catIndex = Math.floor(Math.random() * ROUTINE_CATEGORIES.length);
    const category = ROUTINE_CATEGORIES[catIndex];
    const localizedTitle = category.names[language] || category.names.en;
    setScheduleTitle(localizedTitle);

    const chosenItems: DisplayRoutineItem[] = category.items.slice(0, itemCount).map((item, idx) => ({
      id: item.id,
      emoji: item.emoji,
      label: item.labels[language] || item.labels.en,
      originalIndex: idx,
    }));

    setTargetSequence(chosenItems);
    // Shuffle pool items
    setPoolItems([...chosenItems].sort(() => Math.random() - 0.5));
    setSelectedItems([]);
    setIsComplete(false);

    stats.current = {
      firstInteractionLatencyMs: null as number | null,
      responseTimes: [] as number[],
      corrections: 0,
      hesitationCount: 0,
      hesitationDurationMs: 0,
      maxHesitationMs: 0,
      startTime: Date.now(),
      lastActionTime: Date.now(),
      completed: false,
    };
    resetIdleTimer();
    VoiceService.speakContext('daily_routine', 'start', language, false);
  };

  // User taps item from available pool -> places into sequence
  const handleSelectPoolItem = (item: DisplayRoutineItem) => {
    if (stats.current.completed || isComplete) return;
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

    const newSelected = [...selectedItems, item];
    setSelectedItems(newSelected);
    setPoolItems(prev => prev.filter(p => p.id !== item.id));

    // If this completed all slots, auto-evaluate or allow submission
    if (newSelected.length === targetSequence.length) {
      finishGame(newSelected);
    }
  };

  // User taps placed item in reconstructed sequence to remove it -> returns to pool
  const handleRemoveSelectedItem = (item: DisplayRoutineItem) => {
    if (stats.current.completed || isComplete) return;
    resetIdleTimer();

    stats.current.corrections++;
    stats.current.lastActionTime = Date.now();

    setSelectedItems(prev => prev.filter(p => p.id !== item.id));
    setPoolItems(prev => [...prev, item]);
  };

  // Undo last placement
  const handleUndo = () => {
    if (selectedItems.length === 0 || stats.current.completed || isComplete) return;
    resetIdleTimer();

    stats.current.corrections++;
    stats.current.lastActionTime = Date.now();

    const lastItem = selectedItems[selectedItems.length - 1];
    setSelectedItems(prev => prev.slice(0, -1));
    setPoolItems(prev => [...prev, lastItem]);
  };

  const finishGame = (finalSequence: DisplayRoutineItem[]) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (stats.current.completed) return;
    stats.current.completed = true;
    setIsComplete(true);

    const now = Date.now();
    const totalTime = now - stats.current.startTime;
    const avgRt = stats.current.responseTimes.length > 0
      ? stats.current.responseTimes.reduce((a, b) => a + b, 0) / stats.current.responseTimes.length
      : null;

    // Evaluate matching sequence positions
    let correctMatches = 0;
    finalSequence.forEach((item, idx) => {
      if (item.originalIndex === idx) {
        correctMatches++;
      }
    });

    const accuracy = targetSequence.length > 0 ? (correctMatches / targetSequence.length) : 0;

    // Trigger vocal feedback
    if (accuracy >= 0.7) {
      VoiceService.speakContext('daily_routine', 'success', language, false);
    } else {
      VoiceService.speakContext('daily_routine', 'incorrect', language, false);
    }

    onComplete({
      accuracy: Math.min(1.0, Math.max(0.0, accuracy)),
      avg_response_time_ms: avgRt !== null ? Math.round(avgRt) : null,
      response_times: stats.current.responseTimes,
      repeat_errors: 0,
      corrections: stats.current.corrections,
      completion_time_ms: totalTime,
      total_events: targetSequence.length + stats.current.corrections,
      first_interaction_latency_ms: stats.current.firstInteractionLatencyMs,
      hesitation_count: stats.current.hesitationCount,
      hesitation_duration_ms: stats.current.hesitationDurationMs,
      max_hesitation_ms: stats.current.maxHesitationMs,
    });
  };

  // Localized UI string dictionary
  const uiTexts = {
    subtitle: {
      en: 'Arrange the daily tasks below in their natural order from first to last.',
      te: 'క్రింది పనులను మొదటి నుండి చివరి వరకు సహజమైన వరుస క్రమంలో అమర్చండి.',
      hi: 'नीचे दिए गए कार्यों को पहले से आखिरी तक उनके स्वाभाविक क्रम में व्यवस्थित करें।',
    },
    reconstructedTitle: {
      en: 'Reconstructed Sequence',
      te: 'మీరు అమర్చిన క్రమం',
      hi: 'आपके द्वारा बनाया गया क्रम',
    },
    undo: {
      en: 'Undo',
      te: 'రద్దు',
      hi: 'पूर्ववत करें',
    },
    tapTasksBelow: {
      en: 'Tap tasks below in order from first to last',
      te: 'మొదటి నుండి చివరి వరకు పనులను క్రమంలో నొక్కండి',
      hi: 'पहले से आखिरी तक क्रम में नीचे दिए गए कार्यों को टैप करें',
    },
    chooseNext: {
      en: 'Available Tasks (Tap to place):',
      te: 'లభ్యమయ్యే పనులు (అమర్చడానికి నొక్కండి):',
      hi: 'उपलब्ध कार्य (रखने के लिए टैप करें):',
    },
    slotLabel: {
      en: 'Step',
      te: 'దశ',
      hi: 'चरण',
    },
    tapToRemove: {
      en: 'Tap to return',
      te: 'తిరిగి పంపండి',
      hi: 'हटाने के लिए टैप करें',
    },
    phoneSensorActive: {
      en: 'Phone Sensor Active: Observing sequencing cadence & hesitation intervals',
      te: 'ఫోన్ సెన్సార్ సక్రియం: క్రమబద్ధత మరియు విరామ సమయాలను గమనిస్తున్నారు',
      hi: 'फोन सेंसर सक्रिय: क्रमबद्धता और ठहराव का अवलोकन',
    },
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto py-2">
      {/* Header Info */}
      <div className="w-full card p-5 mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📋</span> {t('games.routine.title', 'Daily Routine Recall')} — {scheduleTitle}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {uiTexts.subtitle[language] || uiTexts.subtitle.en}
        </p>
      </div>

      {/* Behavioral Sensor Telemetry Banner */}
      <div className="w-full mb-5 px-4 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-900 dark:text-white">
            {uiTexts.phoneSensorActive[language] || uiTexts.phoneSensorActive.en}
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] font-mono text-slate-400">Level {difficulty}</span>
      </div>

      {/* Sequence Placement & Available Tasks */}
      <div className="w-full space-y-6 animate-in fade-in">
          {/* Target Reconstructed Sequence Slots */}
          <div className="card p-6 min-h-[160px]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {uiTexts.reconstructedTitle[language] || uiTexts.reconstructedTitle.en} ({selectedItems.length}/{targetSequence.length})
              </span>
              <div className="flex items-center gap-2">
                {!isComplete && (
                  <button
                    onClick={triggerHint}
                    className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 min-h-[30px]"
                    title="Get a hint for the next task"
                  >
                    <Lightbulb size={13} className="text-amber-600 dark:text-amber-400" />
                    <span>{language === 'te' ? 'సూచన (Hint)' : language === 'hi' ? 'सुझाव (Hint)' : 'Hint'}</span>
                  </button>
                )}
                {selectedItems.length > 0 && !isComplete && (
                  <button
                    onClick={handleUndo}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer min-h-[30px] px-2"
                  >
                    <RotateCcw size={12} />
                    <span>{uiTexts.undo[language] || uiTexts.undo.en}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {/* Render each slot (either filled or empty placeholder) */}
              {Array.from({ length: targetSequence.length }).map((_, slotIdx) => {
                const filledItem = selectedItems[slotIdx];
                if (filledItem) {
                  return (
                    <div
                      key={filledItem.id}
                      onClick={() => handleRemoveSelectedItem(filledItem)}
                      className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 transition-all cursor-pointer hover:border-emerald-500"
                      title={uiTexts.tapToRemove[language] || uiTexts.tapToRemove.en}
                    >
                      <span className="w-6 h-6 rounded-md bg-emerald-200 dark:bg-emerald-800 font-bold text-xs flex items-center justify-center">
                        {slotIdx + 1}
                      </span>
                      <span className="text-xl">{filledItem.emoji}</span>
                      <span className="text-xs sm:text-sm font-bold">{filledItem.label}</span>
                      <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ {uiTexts.tapToRemove[language] || uiTexts.tapToRemove.en}
                      </span>
                    </div>
                  );
                }

                const isCurrentNext = slotIdx === selectedItems.length;
                return (
                  <div
                    key={`slot-${slotIdx}`}
                    className={`p-3 rounded-xl border border-dashed flex items-center gap-3 transition-all ${
                      isCurrentNext
                        ? 'border-blue-400 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-950/20 text-blue-600 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center">
                      {slotIdx + 1}
                    </span>
                    <span className="text-xs italic">
                      {isCurrentNext
                        ? `[ ${(uiTexts.slotLabel[language] || uiTexts.slotLabel.en)} ${slotIdx + 1}: ${(uiTexts.chooseNext[language] || uiTexts.chooseNext.en)} ]`
                        : `[ ${(uiTexts.slotLabel[language] || uiTexts.slotLabel.en)} ${slotIdx + 1} ]`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Available Tasks Pool */}
          {poolItems.length > 0 && !isComplete && (
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block px-1">
                {uiTexts.chooseNext[language] || uiTexts.chooseNext.en}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {poolItems.map((item) => {
                  const isHinted = item.id === hintedItemId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectPoolItem(item)}
                      className={`p-3.5 rounded-xl border-2 text-left flex items-center gap-3 shadow-xs transition-all cursor-pointer active:scale-98 ${
                        isHinted
                          ? 'border-amber-400 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/80 ring-4 ring-amber-400/50 text-amber-900 dark:text-amber-100 animate-pulse'
                          : 'border-slate-300 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 bg-white dark:bg-slate-800 text-black dark:text-white'
                      }`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-xs sm:text-sm font-bold flex-1">{item.label}</span>
                      {isHinted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-black">
                          💡 {language === 'te' ? 'తదుపరి పని' : language === 'hi' ? 'अगला कार्य' : 'Next Step'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* If all slots filled, show completed notice */}
          {selectedItems.length === targetSequence.length && isComplete && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-center font-bold text-sm">
              ✓ {language === 'te' ? 'క్రమం విజయవంతంగా రికార్డ్ చేయబడింది!' : language === 'hi' ? 'क्रम सफलतापूर्वक रिकॉर्ड किया गया!' : 'Sequence successfully recorded!'}
            </div>
          )}
        </div>
    </div>
  );
}
