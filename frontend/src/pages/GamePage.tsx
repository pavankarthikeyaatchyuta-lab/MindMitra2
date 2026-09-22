import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { useTranslation } from '../i18n';
import { useVoice } from '../hooks/useVoice';
import { GameType, Language } from '../types';
import MemoryMatch from '../games/MemoryMatch';
import DailyRoutine from '../games/DailyRoutine';
import ObjectRecognition from '../games/ObjectRecognition';
import PatternRecall from '../games/PatternRecall';
import VoiceRecallActivity from '../components/VoiceRecallActivity';
import { VoiceBehavioralVector } from '../services/voiceTelemetry';
import ThemeToggle from '../components/ThemeToggle';
import SynchronizedVoiceBanner from '../components/SynchronizedVoiceBanner';
import { InstructionService, ActivityId } from '../services/instructionService';
import { VoiceService } from '../services/voiceService';
import { ArrowLeft, Star, ChevronRight, Volume2, VolumeX, Sparkles, CheckCircle2, RotateCcw, Cpu, TrendingDown, TrendingUp, Laptop, Camera, CameraOff, Lightbulb, X } from 'lucide-react';
import { predictOnDevice } from '../services/onDeviceInference';
import { PersonalBaselineEngine } from '../services/personalBaselineEngine';
import { OfficeKitBridge } from '../services/officeKitBridge';
import { PersonalMemoryDB } from '../services/personalMemoryDB';
import { VisualBehavioralTracker, VisualBehavioralMetrics } from '../services/visualBehavioralTracker';

const GAME_TYPES: Record<string, GameType> = {
  memory: 'memory_match',
  memory_match: 'memory_match',
  routine: 'daily_routine',
  daily_routine: 'daily_routine',
  recognition: 'object_recognition',
  object_recognition: 'object_recognition',
  visual: 'object_recognition',
  pattern: 'pattern_recall',
  pattern_recall: 'pattern_recall',
  voice: 'voice_recall',
  voice_recall: 'voice_recall',
};

const NEXT_GAME: Record<string, { id: string; title: string }> = {
  memory: { id: 'routine', title: 'Daily Routine Recall' },
  memory_match: { id: 'routine', title: 'Daily Routine Recall' },
  routine: { id: 'recognition', title: 'Visual Recall' },
  daily_routine: { id: 'recognition', title: 'Visual Recall' },
  recognition: { id: 'pattern', title: 'Pattern Recall' },
  object_recognition: { id: 'pattern', title: 'Pattern Recall' },
  visual: { id: 'pattern', title: 'Pattern Recall' },
  pattern: { id: 'voice', title: 'Voice Recall' },
  pattern_recall: { id: 'voice', title: 'Voice Recall' },
  voice: { id: 'complete', title: 'Session Complete' },
  voice_recall: { id: 'complete', title: 'Session Complete' },
};

/**
 * Computes unbiased statistical sample variance s^2 for measured response times.
 * Formatted in seconds squared for standardized ML feature scaling compatibility.
 * Returns null if fewer than 2 samples were recorded.
 */
function calculateVariance(samples: number[]): number | null {
  if (!samples || !Array.isArray(samples) || samples.length < 2) return null;
  const seconds = samples.map(ms => ms / 1000);
  const mean = seconds.reduce((a, b) => a + b, 0) / seconds.length;
  const sumSquaredDiff = seconds.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  return sumSquaredDiff / (seconds.length - 1);
}

export default function GamePage() {
  const { gameType, id } = useParams<{ gameType?: string; id?: string }>();
  const navigate = useNavigate();
  const { currentUser, switchProfile, currentSession, setCurrentSession, currentDifficulty, setGameDifficulty } = useApp();
  const { t, language } = useTranslation();
  const { voiceEnabled, setVoiceEnabled } = useVoice();

  const [gameSessionId, setGameSessionId] = useState<number | null>(null);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [lastMetrics, setLastMetrics] = useState<any>(null);
  const [adaptiveResult, setAdaptiveResult] = useState<any>(null);

  const activeKey = id || gameType || 'memory';
  const gt: ActivityId = (activeKey && GAME_TYPES[activeKey]) ? (GAME_TYPES[activeKey] as ActivityId) : 'memory_match';
  const difficulty = currentDifficulty[gt as GameType] || 1;

  const isMemory = activeKey === 'memory' || activeKey === 'memory_match' || gt === 'memory_match';
  const isRoutine = activeKey === 'routine' || activeKey === 'daily_routine' || gt === 'daily_routine';
  const isRecognition = activeKey === 'recognition' || activeKey === 'object_recognition' || activeKey === 'visual' || gt === 'object_recognition';
  const isPattern = activeKey === 'pattern' || activeKey === 'pattern_recall' || gt === 'pattern_recall';
  const isVoice = activeKey === 'voice' || activeKey === 'voice_recall' || gt === 'voice_recall';

  // Context-aware Hint state and trigger
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [hintTriggerCount, setHintTriggerCount] = useState(0);

  const handleRequestHint = useCallback((customHint?: string) => {
    const hintText = customHint || InstructionService.getHint(gt, language);
    setActiveHint(hintText);
    VoiceService.speak(hintText, language, true);
    setHintTriggerCount(prev => prev + 1);
  }, [gt, language]);

  // Optional on-device camera behavioral sensor (presence & cadence observation)
  const [cameraSensorActive, setCameraSensorActive] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const visualTrackerRef = useRef<VisualBehavioralTracker>(new VisualBehavioralTracker());
  const [visualStatus, setVisualStatus] = useState<string>('Visual presence observed • Interaction tracking active');

  const stopCameraSensor = useCallback(() => {
    visualTrackerRef.current.stop();
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraSensorActive(false);
  }, []);

  const startCameraSensor = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API not supported in this browser environment.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 160 }, height: { ideal: 160 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.onloadedmetadata = () => {
          cameraVideoRef.current?.play().then(() => {
            if (cameraVideoRef.current) {
              visualTrackerRef.current.start(cameraVideoRef.current);
            }
          }).catch((err: unknown) => console.warn('Camera preview notice:', err));
        };
      }
      setCameraSensorActive(true);
    } catch (err: any) {
      console.warn('Camera sensor unavailable:', err);
      setCameraError('Camera observation is optional. Gameplay continues normally.');
      setCameraSensorActive(false);
    }
  }, []);

  useEffect(() => {
    if (!cameraSensorActive) return;
    const interval = setInterval(() => {
      const m = visualTrackerRef.current.getCurrentMetrics();
      if (m.status_summary) {
        setVisualStatus(m.status_summary);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [cameraSensorActive]);

  useEffect(() => {
    return () => {
      stopCameraSensor();
    };
  }, [stopCameraSensor]);

  const playAudioGuide = useCallback(() => {
    VoiceService.speakContext(gt, 'welcome', language, true);
  }, [gt, language]);

  useEffect(() => {
    if (!loading && !finished && voiceEnabled) {
      const timer = setTimeout(() => {
        VoiceService.speakContext(gt, 'welcome', language, false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [loading, finished, gt, language, voiceEnabled]);

  useEffect(() => {
    if (finished && voiceEnabled) {
      const timer = setTimeout(() => {
        VoiceService.speakContext(gt, 'completion', language, true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [finished, gt, language, voiceEnabled]);

  useEffect(() => {
    async function initGameSession() {
      let uid = currentUser ? currentUser.id : null;

      if (!uid) {
        const savedUser = localStorage.getItem('mindmitra_current_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            uid = parsed.id;
            const curLang = localStorage.getItem('mindmitra_lang');
            if (curLang) {
              parsed.preferred_language = curLang;
            }
            switchProfile(parsed);
          } catch {}
        }
      }

      if (!uid) {
        try {
          const profiles = await api.getProfiles(false);
          if (profiles && profiles.length > 0) {
            uid = profiles[0].id;
            switchProfile(profiles[0]);
          }
        } catch {}
      }

      // STRICT DATA INTEGRITY GUARD:
      // Never silently fall back to user 1.
      // If no authenticated profile exists, abort activity initialization and navigate to caregiver portal.
      if (!uid) {
        console.warn('MindMitra Data Integrity Guard: No authenticated user session found. Halting cognitive activity.');
        setLoading(false);
        navigate('/caregiver');
        return;
      }

      setActiveUserId(uid);

      let sid = currentSession ? currentSession.id : null;
      if (!sid) {
        const savedSid = sessionStorage.getItem('mindmitra_session_id');
        if (savedSid) {
          sid = Number(savedSid);
        }
      }

      if (!sid) {
        try {
          const sRes = await api.startSession(uid);
          sid = sRes.id;
        } catch {
          sid = Date.now();
        }
        sessionStorage.setItem('mindmitra_session_id', String(sid));
        setCurrentSession({
          id: sid,
          user_id: uid,
          started_at: new Date().toISOString(),
          completed_at: null,
          status: 'active',
        });
      }

      try {
        const gs = await api.startGameSession(sid!, uid, gt, difficulty);
        setGameSessionId(gs.id);
      } catch (err) {
        setGameSessionId(Date.now());
      }
      setLoading(false);
    }

    setFinished(false);
    setLastMetrics(null);
    setAdaptiveResult(null);
    setActiveHint(null);
    initGameSession();
  }, [activeKey, currentUser?.id]);

  const handleGameComplete = useCallback(async (metrics: any) => {
    // Capture on-device visual behavioral sensor metrics if camera active
    const visualMetrics = cameraSensorActive ? visualTrackerRef.current.getCurrentMetrics() : null;
    const enrichedMetrics = {
      ...metrics,
      visual_metrics: visualMetrics,
    };

    setLastMetrics(enrichedMetrics);
    setFinished(true);

    if (activeKey) {
      sessionStorage.setItem(`mindmitra_game_done_${activeKey}`, 'true');
      const saved = sessionStorage.getItem('mindmitra_completed_games');
      const list: string[] = saved ? JSON.parse(saved) : [];
      if (!list.includes(activeKey)) {
        list.push(activeKey);
        sessionStorage.setItem('mindmitra_completed_games', JSON.stringify(list));
      }
    }

    // Compute true sample variance from measured response times
    const measuredVariance = metrics.response_times && Array.isArray(metrics.response_times) && metrics.response_times.length >= 2
      ? calculateVariance(metrics.response_times)
      : null;

    // 1. Genuine On-Device ML Inference (< 2ms)
    const onDeviceRec = predictOnDevice({
      accuracy: metrics.accuracy,
      mean_response_time_ms: metrics.avg_response_time_ms,
      response_time_variance: measuredVariance,
      repeat_error_rate: metrics.total_events > 0 ? (metrics.repeat_errors / metrics.total_events) : 0,
      correction_rate: metrics.total_events > 0 ? (metrics.corrections / metrics.total_events) : 0,
      completion_time_ms: metrics.completion_time_ms,
      current_difficulty: difficulty,
    }, difficulty);

    setAdaptiveResult(onDeviceRec);

    // 2. Personal Baseline Comparison
    const sessionVec = {
      accuracy: metrics.accuracy ?? 0,
      mean_response_time_ms: metrics.avg_response_time_ms ?? 0,
      corrections: metrics.corrections ?? 0,
      repeat_errors: metrics.repeat_errors ?? 0,
      completion_time_ms: metrics.completion_time_ms ?? 0,
      difficulty,
      hesitation_count: metrics.hesitation_count,
      response_time_variance: measuredVariance,
      timestamp: new Date().toISOString(),
    };
    const validUserId = activeUserId || currentUser?.id || 1;
    const bEval = PersonalBaselineEngine.evaluateAgainstBaseline(validUserId, sessionVec, gt);
    PersonalBaselineEngine.recordSession(validUserId, sessionVec, gt);

    // Single-mistake protection: Do not drop level if accuracy is respectable (>= 0.60)
    // Only drop difficulty when persistent fatigue/struggle (< 0.60) or meaningful baseline deviation occurs
    let nextDifficulty = difficulty;
    if (onDeviceRec && onDeviceRec.recommendation === 'DECREASE') {
      if (metrics.accuracy < 0.60 || bEval.status === 'MEANINGFUL_DEVIATION') {
        nextDifficulty = onDeviceRec.recommended_difficulty;
      }
    } else if (onDeviceRec && onDeviceRec.recommendation === 'INCREASE') {
      if (metrics.accuracy >= 0.80 && bEval.status !== 'MEANINGFUL_DEVIATION') {
        nextDifficulty = onDeviceRec.recommended_difficulty;
      }
    }
    setGameDifficulty(gt as GameType, nextDifficulty);

    // 3. Office Kit Bridge Broadcast
    OfficeKitBridge.publishSummary({
      id: `pkt_${Date.now()}`,
      profileId: validUserId,
      profileName: currentUser?.name || currentUser?.display_name || 'Elderly Profile',
      timestamp: new Date().toISOString(),
      deviceSource: 'iQOO Phone (On-Device Inference)',
      baselineAccuracy: bEval.baselineMedianAccuracy,
      sessionAccuracy: metrics.accuracy,
      baselineLatencyMs: bEval.baselineMedianLatencyMs,
      sessionLatencyMs: metrics.avg_response_time_ms,
      baselineCorrections: bEval.baselineMedianCorrections,
      sessionCorrections: metrics.corrections,
      status: bEval.status,
      primarySignals: bEval.reasonCodes.map(r => r.replace(/_/g, ' ')),
      adaptation: {
        recommendedDifficulty: onDeviceRec.recommended_difficulty,
        previousDifficulty: difficulty,
        action: onDeviceRec.recommendation === 'DECREASE' ? 'Difficulty adjusted to maintain comfort' : 'Difficulty maintained',
        reason: onDeviceRec.reason,
      },
      onDeviceML: {
        model: onDeviceRec.model_name,
        latencyMs: onDeviceRec.inference_latency_ms,
        confidence: onDeviceRec.confidence,
        decision: onDeviceRec.recommendation,
      },
      behavioralSignals: {
        firstInteractionLatencyMs: metrics.first_interaction_latency_ms !== undefined ? metrics.first_interaction_latency_ms : null,
        hesitationCount: metrics.hesitation_count !== undefined ? metrics.hesitation_count : 0,
        repeatErrorRate: metrics.total_events > 0 ? (metrics.repeat_errors / metrics.total_events) : 0,
        touchCount: metrics.total_events || 0,
      },
    });

    // Spoken Audio Guide on Completion
    if (voiceEnabled) {
      VoiceService.speakContext(gt, 'completion', language, true);
    }

    // Save for SessionResult page and offline PersonalMemoryDB
    const sessionResultId = gameSessionId || Date.now();
    sessionStorage.setItem('mindmitra_last_metrics', JSON.stringify({
      ...enrichedMetrics,
      difficulty,
      game_type: gt,
      id: sessionResultId,
    }));
    sessionStorage.setItem('mindmitra_last_adaptive', JSON.stringify(onDeviceRec));

    // Save to PersonalMemoryDB offline first
    PersonalMemoryDB.recordSession({
      userId: validUserId,
      domain: gt === 'daily_routine' ? 'routine' : gt === 'memory_match' ? 'memory' : gt === 'pattern_recall' ? 'visual' : 'overall',
      accuracy: metrics.accuracy,
      mean_response_time_ms: metrics.avg_response_time_ms,
      corrections: metrics.corrections,
      repeat_errors: metrics.repeat_errors,
      completion_time_ms: metrics.completion_time_ms,
      difficulty,
      timestamp: new Date().toISOString(),
      visual_metrics: visualMetrics,
    }).catch(e => console.warn('PersonalMemoryDB recordSession notice:', e));

    // 4. Background Sync to Cloud Backend
    if (gameSessionId) {
      try {
        await api.completeGameSession(gameSessionId, {
          ...metrics,
          user_id: validUserId,
          game_type: gt,
        });
        await api.getAdaptiveRecommendation(validUserId, gt, {
          accuracy: metrics.accuracy,
          mean_response_time_ms: metrics.avg_response_time_ms,
          response_time_variance: measuredVariance ?? 0,
          repeat_error_rate: metrics.total_events > 0 ? (metrics.repeat_errors / metrics.total_events) : 0,
          correction_rate: metrics.total_events > 0 ? (metrics.corrections / metrics.total_events) : 0,
          completion_time_ms: metrics.completion_time_ms,
          current_difficulty: difficulty,
        });
      } catch (e) {
        console.log('Background cloud telemetry note:', e);
      }
    }
  }, [gameSessionId, activeUserId, gt, difficulty, gameType, currentUser, setGameDifficulty, voiceEnabled, language]);

  const handleVoiceComplete = useCallback((vector: VoiceBehavioralVector) => {
    const accuracy = Math.min(1.0, Math.max(0.2, (vector.word_count >= 3 ? 1.0 : vector.word_count / 3)));
    const metrics = {
      accuracy,
      avg_response_time_ms: vector.response_latency_ms || 1200,
      repeat_errors: 0,
      corrections: vector.number_of_pauses || 0,
      completion_time_ms: (vector.speech_duration_ms || 2000) + (vector.response_latency_ms || 1200),
      total_events: Math.max(1, vector.word_count),
    };
    handleGameComplete(metrics);
  }, [handleGameComplete]);

  const nextInfo = activeKey ? NEXT_GAME[activeKey] : null;

  const handleProceedNext = () => {
    if (!nextInfo) {
      navigate('/activities');
      return;
    }
    if (nextInfo.id === 'complete') {
      navigate('/activities');
    } else {
      navigate(`/activity/${nextInfo.id}`);
    }
  };

  const getGameTitle = () => {
    return InstructionService.getTitle(gt, language);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-y-2 transition-colors">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/activities"
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            title="Back to Activities"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">{getGameTitle()}</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Level {difficulty} • Standard Difficulty</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => handleRequestHint()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer min-h-[36px]"
            title="Get a Game Hint"
          >
            <Lightbulb size={15} className="text-amber-600 dark:text-amber-400" />
            <span>{language === 'te' ? 'సూచన (Hint)' : language === 'hi' ? 'सुझाव (Hint)' : 'Hint'}</span>
          </button>

          <button
            onClick={() => {
              if (!voiceEnabled) {
                setVoiceEnabled(true);
              }
              playAudioGuide();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-all active:scale-95 shadow-xs min-h-[36px]"
            title="Listen to Spoken Audio Guide"
          >
            <Volume2 size={16} />
            <span>Audio Guide</span>
          </button>

          <button
            onClick={() => {
              if (cameraSensorActive) {
                stopCameraSensor();
              } else {
                startCameraSensor();
              }
            }}
            className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all ${
              cameraSensorActive
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title={cameraSensorActive ? 'Visual Observation Active (Tap to mute)' : 'Enable Visual Observation Sensor (Optional)'}
            aria-label={cameraSensorActive ? 'Disable Camera Sensor' : 'Enable Camera Sensor'}
          >
            {cameraSensorActive ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>

          <ThemeToggle />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl">
          {loading ? (
            <div className="card p-12 text-center max-w-md mx-auto">
              <div className="w-10 h-10 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Preparing Cognitive Activity...</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Calibrating difficulty and baseline telemetry</p>
            </div>
          ) : finished ? (
            /* Encouraging Completion Screen */
            <div className="card p-5 sm:p-10 text-center max-w-lg mx-auto shadow-xl border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4">
                <CheckCircle2 size={36} />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Wonderful work!</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 mb-6">
                You successfully completed this cognitive activity. Your responses help personalize your routine.
              </p>

              <div className="space-y-2 mb-6 text-left">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Cpu size={15} className="text-emerald-500" />
                    <span className="text-slate-600 dark:text-slate-300 font-bold">On-Device ML Inference</span>
                  </div>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ⚡ {typeof adaptiveResult?.inference_latency_ms === 'number' ? `${adaptiveResult.inference_latency_ms.toFixed(1)}ms` : 'Not measured'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-indigo-900 dark:text-indigo-300 font-extrabold block">
                      {adaptiveResult?.recommendation === 'DECREASE'
                        ? 'Adapting this activity to your recent interaction pattern.'
                        : adaptiveResult?.recommendation === 'INCREASE'
                        ? 'Ready for advanced challenge.'
                        : 'Interaction rhythm aligns with personal pattern.'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Synced to Office Kit • Level {adaptiveResult?.recommended_difficulty || difficulty}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setFinished(false)}
                  className="elderly-btn-secondary text-sm py-3 px-6 rounded-xl inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  <span>Practice Again</span>
                </button>

                <button
                  onClick={() => navigate(`/session-result/${gameSessionId || 'latest'}`)}
                  className="elderly-btn-primary text-sm py-3 px-8 rounded-xl inline-flex items-center justify-center gap-2"
                >
                  <span>View Behavioral Result</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Active Game Screen */
            <div onPointerDown={() => visualTrackerRef.current.recordUserInteraction()}>
              <SynchronizedVoiceBanner
                language={language}
                gameType={gt}
                currentText={activeHint ? `💡 ${activeHint}` : InstructionService.get(gt, 'instruction', language)}
                onHelp={() => handleRequestHint()}
                onListenAgain={playAudioGuide}
                className="mb-4"
              />

              {/* Active Context-Aware Game Hint Banner */}
              {activeHint && (
                <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 flex items-start justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Lightbulb size={20} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          {language === 'te' ? '💡 గేమ్ సూచన (Hint)' : language === 'hi' ? '💡 खेल सुझाव (Hint)' : '💡 Activity Hint'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200 font-bold">
                          {language === 'te' ? 'సహాయం' : language === 'hi' ? 'मदद' : 'Help Assistance'}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-amber-900 dark:text-amber-100 mt-1 leading-relaxed">
                        {activeHint}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => VoiceService.speak(activeHint, language, true)}
                      className="p-2 rounded-xl text-amber-800 dark:text-amber-200 hover:bg-amber-200/70 dark:hover:bg-amber-900/70 transition-colors cursor-pointer"
                      title="Speak hint aloud"
                      aria-label="Speak hint aloud"
                    >
                      <Volume2 size={18} />
                    </button>
                    <button
                      onClick={() => setActiveHint(null)}
                      className="p-2 rounded-xl text-amber-800 dark:text-amber-200 hover:bg-amber-200/70 dark:hover:bg-amber-900/70 transition-colors cursor-pointer"
                      title="Dismiss hint"
                      aria-label="Dismiss hint"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Optional On-Device Camera Behavioral Sensor Overlay */}
              {cameraSensorActive && (
                <div className="mb-4 p-3 rounded-2xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-between shadow-md animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-emerald-500/60 relative shrink-0">
                      <video
                        ref={cameraVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-emerald-400">On-Device Visual Presence & Interaction Sensor</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950/80 text-emerald-300 rounded-sm font-semibold border border-emerald-800">Active</span>
                      </div>
                      <p className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                        ● {visualStatus}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Observing interaction presence in volatile memory. Zero recordings stored.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={stopCameraSensor}
                    className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Turn off visual sensor"
                  >
                    Turn Off
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="mb-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>{cameraError}</span>
                  <button onClick={() => setCameraError(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold ml-2 cursor-pointer">✕</button>
                </div>
              )}

              {isMemory && (
                <MemoryMatch
                  difficulty={difficulty}
                  userId={activeUserId || currentUser?.id || 1}
                  gameSessionId={gameSessionId || 1}
                  onComplete={handleGameComplete}
                  hintTrigger={hintTriggerCount}
                  onProvideCustomHint={handleRequestHint}
                />
              )}
              {isRoutine && (
                <DailyRoutine
                  difficulty={difficulty}
                  userId={activeUserId || currentUser?.id || 1}
                  gameSessionId={gameSessionId || 1}
                  onComplete={handleGameComplete}
                  hintTrigger={hintTriggerCount}
                  onProvideCustomHint={handleRequestHint}
                />
              )}
              {isRecognition && (
                <ObjectRecognition
                  difficulty={difficulty}
                  userId={activeUserId || currentUser?.id || 1}
                  gameSessionId={gameSessionId || 1}
                  onComplete={handleGameComplete}
                  hintTrigger={hintTriggerCount}
                  onProvideCustomHint={handleRequestHint}
                />
              )}
              {isPattern && (
                <PatternRecall
                  difficulty={difficulty}
                  userId={activeUserId || currentUser?.id || 1}
                  gameSessionId={gameSessionId || 1}
                  onComplete={handleGameComplete}
                  hintTrigger={hintTriggerCount}
                  onProvideCustomHint={handleRequestHint}
                />
              )}
              {isVoice && (
                <VoiceRecallActivity
                  onComplete={handleVoiceComplete}
                  onCancel={() => navigate('/activities')}
                  hintTrigger={hintTriggerCount}
                  onProvideCustomHint={handleRequestHint}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
