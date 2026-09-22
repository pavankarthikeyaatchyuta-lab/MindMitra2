import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Brain, 
  Sparkles, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  CheckCircle2, 
  Cpu, 
  ShieldCheck, 
  ChevronRight, 
  RotateCcw, 
  Volume2, 
  Mic, 
  Camera, 
  Send,
  Laptop,
  Calendar,
  History,
  ListOrdered
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import MemoryMatch from '../games/MemoryMatch';
import VoiceRecallActivity from '../components/VoiceRecallActivity';
import CameraRecallActivity from '../components/CameraRecallActivity';
import { TouchSensorTracker, TouchBehavioralVector } from '../services/touchTelemetry';
import { VoiceBehavioralVector } from '../services/voiceTelemetry';
import { predictOnDevice, OnDeviceInferenceResult } from '../services/onDeviceInference';
import { PersonalBaselineEngine, PersonalBaselineMetrics, SessionEvidenceVector } from '../services/personalBaselineEngine';
import { 
  LocalTemplateExplanationProvider, 
  OllamaExplanationProvider, 
  BehavioralExplanationResult, 
  BehavioralExplanationRequest 
} from '../services/explanationProvider';
import { OfficeKitBridge, OfficeKitPacket } from '../services/officeKitBridge';
import { User, FamiliarPerson } from '../types';
import { useVoice } from '../hooks/useVoice';
import { useTranslation } from '../i18n';
import { InstructionService } from '../services/instructionService';
import { VoiceService, VoiceState } from '../services/voiceService';
import { PersonalMemoryDB } from '../services/personalMemoryDB';

export default function PersonalPatternExperience() {
  const navigate = useNavigate();
  const { currentUser, switchProfile } = useApp();
  const { language } = useTranslation();
  const { speak, voiceEnabled, setVoiceEnabled } = useVoice();

  const [profiles, setProfiles] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [step, setStep] = useState<'intro' | 'activity' | 'voice_activity' | 'camera_activity' | 'evaluation' | 'adapted'>('intro');
  const [activityMode, setActivityMode] = useState<'touch' | 'voice' | 'camera'>('touch');
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(3);
  const [adaptedDifficulty, setAdaptedDifficulty] = useState<number>(3);
  const [explanation, setExplanation] = useState<BehavioralExplanationResult | null>(null);
  const [showTimeline, setShowTimeline] = useState<boolean>(false);
  
  // Familiar People for Camera Recall & Recognition
  const [familiarPeople, setFamiliarPeople] = useState<FamiliarPerson[]>([]);
  const [activeFamiliarPerson, setActiveFamiliarPerson] = useState<FamiliarPerson | null>(null);

  // Telemetry & Results
  const [touchVector, setTouchVector] = useState<TouchBehavioralVector | null>(null);
  const [voiceVector, setVoiceVector] = useState<VoiceBehavioralVector | null>(null);
  const [inferenceResult, setInferenceResult] = useState<OnDeviceInferenceResult | null>(null);
  const [baselineMetrics, setBaselineMetrics] = useState<PersonalBaselineMetrics | null>(null);
  const [syncedPacket, setSyncedPacket] = useState<OfficeKitPacket | null>(null);

  const touchTracker = useRef<TouchSensorTracker>(new TouchSensorTracker(3));

  const [history, setHistory] = useState<SessionEvidenceVector[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [voiceSubtitles, setVoiceSubtitles] = useState<string>('');

  const loadFamiliarPeople = async (userId: number) => {
    try {
      const fam = await api.getFamiliarPeople(userId);
      setFamiliarPeople(fam);
      if (fam && fam.length > 0) {
        setActiveFamiliarPerson(fam[0]);
      } else {
        setActiveFamiliarPerson(null);
      }
    } catch {
      setFamiliarPeople([]);
      setActiveFamiliarPerson(null);
    }
  };

  const loadUserHistory = async (userId: number) => {
    setHistoryLoading(true);
    const syncList = PersonalBaselineEngine.getSessionHistory(userId, 'overall');
    try {
      const dbList = await PersonalMemoryDB.getSessionHistory(userId, 'overall');
      const map = new Map<string, SessionEvidenceVector>();
      syncList.forEach(s => map.set(s.timestamp + '_' + s.accuracy, s));
      dbList.forEach(s => map.set(s.timestamp + '_' + s.accuracy, {
        accuracy: s.accuracy,
        mean_response_time_ms: s.mean_response_time_ms,
        corrections: s.corrections,
        repeat_errors: s.repeat_errors,
        completion_time_ms: s.completion_time_ms,
        difficulty: s.difficulty,
        hesitation_count: s.telemetryDetails?.hesitationCount,
        response_time_variance: s.telemetryDetails?.responseTimeVariance,
        timestamp: s.timestamp,
      }));

      // Ingest backend game sessions if available for full consistency
      try {
        const backendGames = await api.getUserGameSessions(userId);
        if (backendGames && backendGames.length > 0) {
          backendGames.forEach(bg => {
            const key = (bg.completed_at || bg.started_at) + '_' + (bg.accuracy || 0);
            if (!map.has(key)) {
              map.set(key, {
                accuracy: bg.accuracy || 0.8,
                mean_response_time_ms: bg.avg_response_time_ms || 2000,
                corrections: bg.corrections || 0,
                repeat_errors: bg.repeat_errors || 0,
                completion_time_ms: bg.completion_time_ms || 25000,
                difficulty: bg.difficulty || 2,
                timestamp: bg.completed_at || bg.started_at,
              });
            }
          });
        }
      } catch {}

      const merged = Array.from(map.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setHistory(merged);
    } catch {
      setHistory(syncList);
    }
    setHistoryLoading(false);
  };

  // Pre-seed demonstration baselines for Rajesh Kumar and Sunita Devi if empty
  useEffect(() => {
    async function load() {
      try {
        const fetched = await api.getProfiles(false);
        if (fetched && fetched.length > 0) {
          setProfiles(fetched);
          const active = currentUser || fetched[0];
          setSelectedUser(active);
          
          const rajesh = fetched.find(p => (p.name?.toLowerCase().includes('rajesh') || p.display_name?.toLowerCase().includes('rajesh')) && (p as any).is_demo);
          const sunita = fetched.find(p => (p.name?.toLowerCase().includes('sunita') || p.display_name?.toLowerCase().includes('sunita')) && (p as any).is_demo);
          if (rajesh && sunita) {
            PersonalBaselineEngine.seedDemonstrationBaselines(rajesh.id, sunita.id);
          }

          await loadUserHistory(active.id);
          await loadFamiliarPeople(active.id);
        }
      } catch (err) {
        console.warn('Could not load profiles:', err);
      }
    }
    load();
  }, []);

  // Listen to voice state for synchronized subtitle
  useEffect(() => {
    const unsub = VoiceService.subscribe(state => {
      setVoiceSubtitles(state.isSpeaking ? state.currentText : '');
    });
    return unsub;
  }, []);

  const activeUserId = selectedUser ? selectedUser.id : 1;
  const sessionCount = history.length;
  const isCalibrating = sessionCount < 3;
  const measuredAccs = history.map(s => s.accuracy).filter((a): a is number => typeof a === 'number');
  const baselineMedianAcc = measuredAccs.length > 0 ? PersonalBaselineEngine.calculateMedian(measuredAccs) : null;
  const measuredLats = history.map(s => s.mean_response_time_ms).filter((l): l is number => typeof l === 'number' && l !== null);
  const baselineMedianLat = measuredLats.length > 0 ? PersonalBaselineEngine.calculateMedian(measuredLats) : null;
  const measuredCorrs = history.map(s => s.corrections).filter((c): c is number => typeof c === 'number');
  const baselineMedianCorr = measuredCorrs.length > 0 ? PersonalBaselineEngine.calculateMedian(measuredCorrs) : null;

  const latestSession = sessionCount > 0 ? history[sessionCount - 1] : null;
  const currentBaseline = latestSession 
    ? PersonalBaselineEngine.evaluateAgainstBaseline(activeUserId, latestSession, 'overall')
    : null;
  const currentStatus: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION' = 
    isCalibrating ? 'CALIBRATING' : (currentBaseline?.status || 'NORMAL');

  // Handle Switch Profile
  const handleProfileSelect = (user: User) => {
    setSelectedUser(user);
    switchProfile(user);
    loadUserHistory(user.id);
    loadFamiliarPeople(user.id);
    setStep('intro');
    setTouchVector(null);
    setVoiceVector(null);
    setInferenceResult(null);
    setBaselineMetrics(null);
    setSyncedPacket(null);
  };

  // Start the Activity
  const handleStartActivity = (mode: 'touch' | 'voice' | 'camera' = 'touch') => {
    setActivityMode(mode);
    touchTracker.current.reset(currentDifficulty);
    if (mode === 'voice') {
      setStep('voice_activity');
    } else if (mode === 'camera') {
      setStep('camera_activity');
    } else {
      setStep('activity');
    }
  };

  // Process Completed Touch Game
  const handleTouchComplete = (metrics: any) => {
    const rawVector = touchTracker.current.finalize(metrics.accuracy);
    setTouchVector(rawVector);
    runInferenceAndAdaptation(rawVector);
  };

  // Process Completed Voice Recall
  const handleVoiceComplete = (vVector: VoiceBehavioralVector) => {
    setVoiceVector(vVector);
    const speechDur = vVector.speech_duration_ms ?? 0;
    const respLat = vVector.response_latency_ms;
    const completionTime = respLat !== null ? (speechDur + respLat) : null;

    const approxTouch: TouchBehavioralVector = {
      first_interaction_latency_ms: respLat,
      mean_inter_tap_latency_ms: respLat,
      response_time_variance: null,
      hesitation_count: vVector.number_of_pauses,
      repeat_error_rate: 0.0,
      correction_rate: 0.0,
      completion_time_ms: completionTime,
      accuracy: vVector.sequence_completeness,
      total_taps: vVector.word_count,
      current_difficulty: currentDifficulty,
      timestamp: new Date().toISOString(),
    };
    setTouchVector(approxTouch);
    runInferenceAndAdaptation(approxTouch, vVector);
  };

  // Process Completed Camera Recall
  const handleCameraComplete = (success: boolean, latencyMs: number, recallType?: 'self_confirmed' | 'assisted') => {
    const approxTouch: TouchBehavioralVector = {
      first_interaction_latency_ms: latencyMs,
      mean_inter_tap_latency_ms: latencyMs,
      response_time_variance: null,
      hesitation_count: recallType === 'assisted' ? 1 : 0,
      repeat_error_rate: 0.0,
      correction_rate: recallType === 'assisted' ? 0.15 : 0.0,
      completion_time_ms: latencyMs,
      accuracy: success ? 1.0 : (recallType === 'assisted' ? 0.75 : 0.60),
      total_taps: 1,
      current_difficulty: currentDifficulty,
      timestamp: new Date().toISOString(),
    };
    setTouchVector(approxTouch);
    runInferenceAndAdaptation(approxTouch);
  };

  // Core Killer Loop: On-Device ML + Personal Baseline + Real-Time Adaptation + Office Kit Sync
  const runInferenceAndAdaptation = (tVector: TouchBehavioralVector, vVector?: VoiceBehavioralVector) => {
    // 1. On-Device Machine Learning Inference (< 2ms)
    const mlDecision = predictOnDevice({
      accuracy: tVector.accuracy,
      mean_response_time_ms: tVector.mean_inter_tap_latency_ms,
      response_time_variance: tVector.response_time_variance,
      repeat_error_rate: tVector.repeat_error_rate,
      correction_rate: tVector.correction_rate,
      completion_time_ms: tVector.completion_time_ms,
      current_difficulty: tVector.current_difficulty,
      previous_session_accuracy: 0.88,
      recent_trend: 0.0,
    }, currentDifficulty);
    setInferenceResult(mlDecision);

    // 2. Personal Baseline Comparison
    const sessionVector: SessionEvidenceVector = {
      accuracy: tVector.accuracy,
      mean_response_time_ms: tVector.mean_inter_tap_latency_ms,
      corrections: Math.round(tVector.correction_rate * tVector.total_taps) || (tVector.accuracy < 0.5 ? 3 : 1),
      repeat_errors: Math.round(tVector.repeat_error_rate * tVector.total_taps) || 0,
      completion_time_ms: tVector.completion_time_ms,
      difficulty: currentDifficulty,
      timestamp: tVector.timestamp,
    };

    const bMetrics = PersonalBaselineEngine.evaluateAgainstBaseline(activeUserId, sessionVector, 'overall');
    setBaselineMetrics(bMetrics);

    // 3. Store in Personal History
    PersonalBaselineEngine.recordSession(activeUserId, sessionVector, 'overall');
    loadUserHistory(activeUserId);

    // 4. Determine Real-time Adaptation
    let nextDiff = currentDifficulty;
    if (mlDecision.recommendation === 'DECREASE' || bMetrics.status === 'MEANINGFUL_DEVIATION') {
      // Single-mistake protection: Do not drop level if accuracy is respectable (>= 0.60)
      if (tVector.accuracy < 0.60 || bMetrics.status === 'MEANINGFUL_DEVIATION') {
        nextDiff = Math.max(1, currentDifficulty - 1);
      }
    } else if (mlDecision.recommendation === 'INCREASE' && bMetrics.status === 'NORMAL') {
      nextDiff = Math.min(5, currentDifficulty + 1);
    }
    setAdaptedDifficulty(nextDiff);

    // 4.5 Generate natural-language behavioral explanation (instant template + async Ollama Gemma 3 4B)
    const explanationReq: BehavioralExplanationRequest = {
      profileName: selectedUser?.display_name || selectedUser?.name || 'Individual',
      language,
      baseline: {
        medianAccuracy: bMetrics.baselineMedianAccuracy,
        medianLatencyMs: bMetrics.baselineMedianLatencyMs,
        medianCorrections: bMetrics.baselineMedianCorrections,
        eligibleSessionCount: bMetrics.eligibleSessionCount,
        status: bMetrics.status,
      },
      session: {
        accuracy: tVector.accuracy,
        latencyMs: tVector.mean_inter_tap_latency_ms ?? 0,
        corrections: sessionVector.corrections,
        hesitationCount: tVector.hesitation_count,
        activityType: activityMode.toUpperCase(),
      },
      adaptation: {
        previousDifficulty: currentDifficulty,
        recommendedDifficulty: nextDiff,
        decision: nextDiff < currentDifficulty ? 'DECREASE' : nextDiff > currentDifficulty ? 'INCREASE' : 'MAINTAIN',
        reason: mlDecision.reason,
      },
    };

    const instantExp = LocalTemplateExplanationProvider.generate(explanationReq);
    setExplanation(instantExp);

    OllamaExplanationProvider.generate(explanationReq).then(res => {
      if (res && res.provider === 'ollama_gemma3_4b') {
        setExplanation(res);
      }
    }).catch(() => {});

    // 5. Broadcast to Office Kit Laptop Bridge (Structured v1.0 Packet)
    const officeKitPacket: OfficeKitPacket = OfficeKitBridge.normalizePacket({
      schemaVersion: '1.0',
      id: `pkt_${Date.now()}`,
      profile: {
        id: activeUserId,
        name: selectedUser?.display_name || selectedUser?.name || 'Elderly Profile',
      },
      profileId: activeUserId,
      profileName: selectedUser?.display_name || selectedUser?.name || 'Elderly Profile',
      timestamp: new Date().toISOString(),
      deviceSource: 'iQOO Phone (On-Device Inference)',
      session: {
        id: `sess_${Date.now()}`,
        activityType: activityMode.toUpperCase(),
        accuracy: tVector.accuracy,
        latencyMs: tVector.mean_inter_tap_latency_ms,
        completionTimeMs: tVector.completion_time_ms,
        corrections: sessionVector.corrections,
        repeatErrors: sessionVector.repeat_errors,
      },
      baseline: {
        eligibleSessionCount: history.length,
        medianAccuracy: bMetrics.baselineMedianAccuracy,
        medianLatencyMs: bMetrics.baselineMedianLatencyMs,
        medianCorrections: bMetrics.baselineMedianCorrections,
        status: bMetrics.status,
        statusLabel: bMetrics.status === 'MEANINGFUL_DEVIATION' ? 'Meaningful Deviation' : bMetrics.status === 'MINOR_DEVIATION' ? 'Minor Variation' : 'Aligned with Personal Pattern',
      },
      baselineAccuracy: bMetrics.baselineMedianAccuracy,
      sessionAccuracy: tVector.accuracy,
      baselineLatencyMs: bMetrics.baselineMedianLatencyMs,
      sessionLatencyMs: tVector.mean_inter_tap_latency_ms,
      baselineCorrections: bMetrics.baselineMedianCorrections,
      sessionCorrections: sessionVector.corrections,
      status: bMetrics.status,
      primarySignals: bMetrics.reasonCodes.map(r => r.replace(/_/g, ' ')),
      deviation: {
        status: bMetrics.status,
        isMeaningful: bMetrics.status === 'MEANINGFUL_DEVIATION',
        primarySignals: bMetrics.reasonCodes.map(r => r.replace(/_/g, ' ')),
        reasonCodes: bMetrics.reasonCodes,
        trendDescription: bMetrics.status === 'MEANINGFUL_DEVIATION' ? 'Meaningful deviation from personal baseline' : 'Interaction aligns with personal pattern',
      },
      adaptation: {
        recommendedDifficulty: nextDiff,
        previousDifficulty: currentDifficulty,
        action: nextDiff < currentDifficulty ? 'Difficulty reduced for positive engagement' : nextDiff > currentDifficulty ? 'Difficulty increased for healthy stimulation' : 'Difficulty maintained',
        reason: mlDecision.reason,
      },
      onDeviceML: {
        model: mlDecision.model_name,
        latencyMs: mlDecision.inference_latency_ms,
        confidence: mlDecision.confidence,
        decision: mlDecision.recommendation,
        probabilities: mlDecision.probabilities,
        onDevice: true,
      },
      mlDecision: {
        model: mlDecision.model_name,
        decision: mlDecision.recommendation,
        confidence: mlDecision.confidence,
        probabilities: mlDecision.probabilities,
        inferenceLatencyMs: mlDecision.inference_latency_ms,
        onDevice: true,
      },
      behavioralSignals: {
        firstInteractionLatencyMs: tVector.first_interaction_latency_ms,
        hesitationCount: tVector.hesitation_count,
        repeatErrorRate: tVector.repeat_error_rate,
        touchCount: tVector.total_taps,
        voiceSequenceCompleteness: vVector?.sequence_completeness,
      },
      privacyMetadata: {
        rawAudioRetained: false,
        rawFramesRetained: false,
        clientSideInference: true,
        nonClinicalObservation: true,
      },
    })!;

    OfficeKitBridge.publishSummary(officeKitPacket);
    setSyncedPacket(officeKitPacket);

    setStep('evaluation');
  };

  const playAudioGuide = () => {
    let guideText = '';
    if (step === 'intro') {
      guideText = language === 'te'
        ? 'పర్సనల్ ప్యాటర్న్‌కు స్వాగతం. మీ ఫోన్ మీ సహజ టచ్ వేగం మరియు సంకోచాలను నేర్చుకుంటుంది.'
        : language === 'hi'
        ? 'पर्सनल पैटर्न में आपका स्वागत है। आपका फोन आपकी स्वाभाविक प्रतिक्रिया गति को सीखता है।'
        : 'Welcome to Personal Pattern. The phone learns your natural touch speed and hesitation locally.';
    } else if (step === 'evaluation' || step === 'adapted') {
      guideText = language === 'te'
        ? 'ఆన్-డివైస్ మెషిన్ లెర్నింగ్ విశ్లేషణ పూర్తయింది. సౌలభ్యం కోసం స్థాయి సర్దుబాటు చేయబడింది.'
        : language === 'hi'
        ? 'ऑन-डिवाइस मूल्यांकन पूरा हुआ। आपके आराम के लिए कठिनाई स्तर अनुकूलित किया गया है।'
        : 'On-device local inference complete. The activity level has adapted to keep you comfortable.';
    } else {
      guideText = language === 'te'
        ? 'కార్డులను సహజంగా నొక్కండి.'
        : language === 'hi'
        ? 'कार्डों को स्वाभाविक रूप से स्पर्श करें।'
        : 'Interact naturally with the screen.';
    }
    speak(guideText, language);
  };

  const isDeviation = baselineMetrics?.status === 'MEANINGFUL_DEVIATION' || (touchVector && touchVector.accuracy < 0.65);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 select-none font-sans transition-colors duration-150">
      {/* Top Header Bar */}
      <header className="w-full max-w-md flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Link
            to="/caregiver"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
            title="Caregiver Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
              iQ
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white block leading-tight">MindMitra</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block">iQOO Phone Companion</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={playAudioGuide}
            className="p-1.5 px-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
            title="Listen to Spoken Guide"
          >
            <Volume2 size={14} />
            <span>Guide</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Screen Container */}
      <main className="w-full max-w-md flex-grow flex flex-col justify-center my-4">
        {step === 'intro' && (
          <div className="flex flex-col animate-in fade-in">
            {/* Active Elderly Profile Selector */}
            {profiles.length > 0 && (
              <div className="mb-4 p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">
                    {(selectedUser?.display_name || selectedUser?.name || 'U').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">{selectedUser?.display_name || selectedUser?.name}</h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Personal Baseline Active</span>
                  </div>
                </div>

                <select
                  value={selectedUser?.id ?? ''}
                  onChange={(e) => {
                    const u = profiles.find(p => p.id === Number(e.target.value));
                    if (u) handleProfileSelect(u);
                  }}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2 py-1 font-bold focus:outline-none"
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name || p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Hero Card: "The phone learns what normal looks like for you." */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-md text-center mb-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-500/30 text-[10px] text-blue-700 dark:text-blue-300 font-bold">
                  <ShieldCheck size={12} className="text-blue-500 dark:text-blue-400" />
                  <span>{selectedUser?.is_demo ? 'Demo Profile (Pre-Calibrated)' : 'Personal Behavioral Memory'}</span>
                </div>

                {/* 🔊 Listen Button for Personal Pattern Voice Summary */}
                <button
                  onClick={() => {
                    const summary = InstructionService.getPersonalPatternSummary(currentStatus, language, sessionCount);
                    VoiceService.speak(summary, language, true);
                  }}
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                  title="Listen to Personal Pattern summary"
                >
                  <Volume2 size={13} />
                  <span>{InstructionService.getCommon('listen', language)}</span>
                </button>
              </div>

              {/* Synchronized Voice Subtitle Box if speaking */}
              {voiceSubtitles && (
                <div className="mb-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 text-left animate-in fade-in">
                  <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 block mb-0.5">
                    🔊 Voice Summary
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                    "{voiceSubtitles}"
                  </p>
                </div>
              )}

              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-400/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-3">
                <Brain size={26} />
              </div>

              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-0.5">
                Personal Behavioral Pattern
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
                "Your phone learns what normal looks like for you."
              </p>

              {/* Status Pill */}
              <div className="mb-4">
                {isCalibrating ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-bold">
                    <span>🌱 Building your personal baseline ({sessionCount} of 3 sessions)</span>
                  </div>
                ) : currentStatus === 'MEANINGFUL_DEVIATION' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200 text-xs font-bold">
                    <span>⚡ Meaningful Variation from Personal Baseline</span>
                  </div>
                ) : currentStatus === 'MINOR_DEVIATION' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-xs font-bold">
                    <span>🔍 Minor Variation Observed (Activities Adjusted)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                    <span>✓ Aligned Within Your Usual Pattern</span>
                  </div>
                )}
              </div>

              {/* Baseline Summary Metrics */}
              <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 mb-4 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Accuracy</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {baselineMedianAcc !== null ? `${Math.round(baselineMedianAcc * 100)}%` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Response Time</span>
                  <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                    {baselineMedianLat !== null ? `${(baselineMedianLat / 1000).toFixed(1)}s` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Corrections</span>
                  <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">
                    {baselineMedianCorr !== null ? baselineMedianCorr : '--'}
                  </span>
                </div>
              </div>

              {/* Calibration Progress Bar */}
              <div className="text-left mb-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>{isCalibrating ? 'Calibration Progress' : 'Baseline Calibration'}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                    {Math.min(100, Math.round((sessionCount / 3) * 100))}% ({sessionCount}/3 sessions)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(sessionCount > 0 ? 33 : 10, (sessionCount / 3) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Longitudinal Behavioral Timeline Collapsible */}
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className="w-full mt-3 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <History size={14} className="text-blue-500" />
                  <span>Longitudinal Memory Journey ({history.length} sessions recorded)</span>
                </div>
                <span className="text-xs">{showTimeline ? '▲' : '▼'}</span>
              </button>

              {showTimeline && (
                <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs animate-in fade-in max-h-60 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-slate-400 text-center py-2 text-xs">
                      No recorded sessions yet. Start an activity below to begin calibration.
                    </p>
                  ) : (
                    history.map((sess, idx) => {
                      const phase = idx < 3 ? 'Calibration' : 'Baseline Active';
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                                Session {idx + 1} • {phase}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(sess.timestamp).toLocaleDateString()} {new Date(sess.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs block">
                              {Math.round(sess.accuracy * 100)}%
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {sess.mean_response_time_ms !== null ? `${(sess.mean_response_time_ms / 1000).toFixed(1)}s` : 'Not measured'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Sensor Selection Action Buttons (Touch, Voice, Camera) */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => handleStartActivity('touch')}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center justify-between shadow-lg shadow-blue-500/20 active:scale-98 transition-all cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <span>🎮</span>
                  <div className="text-left">
                    <span className="block text-sm font-extrabold">Start Cognitive Activity</span>
                    <span className="block text-[11px] text-blue-200 font-medium">Touch Cadence & Latency Sensing</span>
                  </div>
                </div>
                <ChevronRight size={18} />
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleStartActivity('voice')}
                  className="py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-extrabold flex items-center justify-center gap-2 active:scale-98 transition-all min-h-[48px] shadow-xs"
                >
                  <Mic size={16} className="text-purple-500 dark:text-purple-400" />
                  <span>Voice Recall</span>
                </button>

                <button
                  onClick={() => handleStartActivity('camera')}
                  className="py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-extrabold flex items-center justify-center gap-2 active:scale-98 transition-all min-h-[48px] shadow-xs"
                >
                  <Camera size={16} className="text-cyan-600 dark:text-cyan-400" />
                  <span>Camera Recall</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center mt-4">
              🛡️ All behavioral inference executes on this device. Non-diagnostic.
            </p>
          </div>
        )}

        {/* STEP: Active Touch Cognitive Activity */}
        {step === 'activity' && (
          <div className="flex flex-col animate-in fade-in">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-extrabold text-blue-400">Activity Level {currentDifficulty}</span>
              <button
                onClick={() => setStep('intro')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div
              onTouchStart={() => touchTracker.current.recordInteraction({ isSuccess: false })}
              onMouseDown={() => touchTracker.current.recordInteraction({ isSuccess: false })}
            >
              <MemoryMatch
                difficulty={currentDifficulty}
                userId={activeUserId}
                gameSessionId={Date.now()}
                onComplete={handleTouchComplete}
              />
            </div>
          </div>
        )}

        {/* STEP: Voice Activity */}
        {step === 'voice_activity' && (
          <VoiceRecallActivity
            onComplete={handleVoiceComplete}
            onCancel={() => setStep('intro')}
          />
        )}

        {/* STEP: Camera Activity */}
        {step === 'camera_activity' && (
          <CameraRecallActivity
            familiarPerson={activeFamiliarPerson}
            familiarPeopleList={familiarPeople}
            onSelectPerson={(p) => setActiveFamiliarPerson(p)}
            onComplete={handleCameraComplete}
            onCancel={() => setStep('intro')}
          />
        )}

        {/* STEP: On-Device Evaluation & Killer Adaptation Moment */}
        {step === 'evaluation' && (
          <div className="flex flex-col animate-in fade-in">
            {/* 4-Stage Core Adaptive Architecture Status Indicator */}
            <div className="mb-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 border-b border-slate-200 dark:border-slate-800 pb-1">
                <span className="text-blue-600 dark:text-blue-400">Core Adaptation Loop</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black border border-amber-500/40">LIVE SESSION</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-bold">
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">✓ [SENSE]</span>
                  <span className="truncate">Touch & Cadence</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">✓ [LOCAL AI]</span>
                  <span className="truncate">{inferenceResult?.recommendation || 'Evaluated'}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">✓ [BASELINE]</span>
                  <span className="truncate">{baselineMetrics?.status?.replace('_', ' ') || 'Compared'}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">⚡ [ADAPT]</span>
                  <span className="truncate">Lvl {adaptedDifficulty}</span>
                </div>
              </div>
            </div>

            {/* On-Device ML Badge */}
            <div className="flex justify-between items-center mb-3 px-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                <Cpu size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>On-Device ML: {inferenceResult?.inference_latency_ms}ms</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">100% Edge Processing</span>
            </div>

            {/* Pattern Feedback Card */}
            {/* Side-by-Side: Personal Baseline vs Today's Session */}
            <div className="grid grid-cols-2 gap-2.5 mb-3 text-left">
              {/* Baseline Card */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Personal Baseline</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Median Accuracy</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {Math.round((baselineMetrics?.baselineMedianAccuracy ?? baselineMedianAcc ?? 0.85) * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Response Latency</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {(((baselineMetrics?.baselineMedianLatencyMs ?? baselineMedianLat ?? 2000)) / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Corrections</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {baselineMetrics?.baselineMedianCorrections ?? baselineMedianCorr ?? 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Today's Session Card */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  <span className={`w-2 h-2 rounded-full ${isDeviation ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span>Today's Session</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Session Accuracy</span>
                    <span className={`text-sm font-black ${(touchVector?.accuracy || 0.9) < (baselineMetrics?.baselineMedianAccuracy ?? baselineMedianAcc ?? 0.85) - 0.1 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {Math.round((touchVector?.accuracy || 0.9) * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Response Latency</span>
                    <span className={`text-sm font-black ${(touchVector?.mean_inter_tap_latency_ms || 2000) > (baselineMetrics?.baselineMedianLatencyMs ?? baselineMedianLat ?? 2000) * 1.25 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {(((touchVector?.mean_inter_tap_latency_ms || 2000)) / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Corrections</span>
                    <span className={`text-sm font-black ${Math.round((touchVector?.correction_rate || 0) * (touchVector?.total_taps || 10)) > (baselineMetrics?.baselineMedianCorrections ?? baselineMedianCorr ?? 1) + 1 ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'}`}>
                      {Math.round((touchVector?.correction_rate || 0) * (touchVector?.total_taps || 10)) || (touchVector && touchVector.accuracy < 0.65 ? 3 : 1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pattern Status Card */}
            {isDeviation ? (
              /* DEVIATION STATE */
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 border-amber-500/70 shadow-2xl text-center mb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-2">
                  <TrendingDown size={22} />
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white mb-0.5">
                  A change from your usual pattern was observed.
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300/90 font-medium mb-3">
                  Interaction pace & accuracy varied from your established baseline.
                </p>

                {/* Real-time Adaptation Notice */}
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/40 text-left">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-1">
                    <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Real-Time Adaptation</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                    Adjusted from Level {currentDifficulty} to Level {adaptedDifficulty} to maintain positive, comforting engagement.
                  </p>
                </div>
              </div>
            ) : (
              /* NORMAL STATE */
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-emerald-500/50 shadow-xl text-center mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-2">
                  <CheckCircle2 size={22} />
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white mb-0.5">
                  Interaction matches your usual pattern.
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/90 font-medium mb-3">
                  Pacing, motor cadence, and response latencies align with your personal baseline.
                </p>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-xs text-slate-700 dark:text-slate-300 font-medium text-left border border-slate-200 dark:border-slate-800">
                  ✨ On-Device inference: {inferenceResult?.recommendation} (Confidence: {Math.round((inferenceResult?.confidence || 0.88) * 100)}%).
                </div>
              </div>
            )}

            {/* Behavioral Explanation Note */}
            {explanation && (
              <div className="p-3.5 mb-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Sparkles size={12} className="text-blue-500" />
                    <span>Behavioral Pacing Note</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[9px] font-bold border border-blue-200 dark:border-blue-800">
                    {explanation.provider === 'ollama_gemma3_4b' ? '🦙 Gemma 3 4B (Ollama)' : '⚡ Edge Template'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {explanation.summary}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal italic">
                  "{explanation.caregiverNote}"
                </p>
              </div>
            )}

            {/* Synced to Office Kit Confirmation Pill */}
            {syncedPacket && (
              <div className="p-3 mb-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700/60 text-indigo-800 dark:text-indigo-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Approved summary synced to Office Kit</span>
                </div>
                <Link to="/office-kit" className="font-bold underline text-indigo-700 dark:text-white">
                  View Laptop
                </Link>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setCurrentDifficulty(adaptedDifficulty);
                  setStep('intro');
                }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition-all min-h-[48px]"
              >
                <span>Continue</span>
                <ChevronRight size={18} />
              </button>

              <button
                onClick={() => setStep('intro')}
                className="w-full py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-white text-xs font-bold transition-colors"
              >
                Back to Pattern Overview
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Medical Disclaimer */}
      <footer className="w-full max-w-md text-center py-2 border-t border-slate-200 dark:border-slate-800/80">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
          ⚠️ Behavioral observation — not a medical diagnosis. MindMitra is a supportive cognitive companion.
        </p>
      </footer>
    </div>
  );
}
