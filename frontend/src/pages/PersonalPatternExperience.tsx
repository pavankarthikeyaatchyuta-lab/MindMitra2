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
  Laptop
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
import { OfficeKitBridge, OfficeKitPacket } from '../services/officeKitBridge';
import { User } from '../types';

export default function PersonalPatternExperience() {
  const navigate = useNavigate();
  const { currentUser, switchProfile } = useApp();

  const [profiles, setProfiles] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [step, setStep] = useState<'intro' | 'activity' | 'voice_activity' | 'camera_activity' | 'evaluation' | 'adapted'>('intro');
  const [activityMode, setActivityMode] = useState<'touch' | 'voice' | 'camera'>('touch');
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(3);
  const [adaptedDifficulty, setAdaptedDifficulty] = useState<number>(3);
  
  // Telemetry & Results
  const [touchVector, setTouchVector] = useState<TouchBehavioralVector | null>(null);
  const [voiceVector, setVoiceVector] = useState<VoiceBehavioralVector | null>(null);
  const [inferenceResult, setInferenceResult] = useState<OnDeviceInferenceResult | null>(null);
  const [baselineMetrics, setBaselineMetrics] = useState<PersonalBaselineMetrics | null>(null);
  const [syncedPacket, setSyncedPacket] = useState<OfficeKitPacket | null>(null);

  const touchTracker = useRef<TouchSensorTracker>(new TouchSensorTracker(3));

  // Pre-seed demonstration baselines for Rajesh Kumar and Sunita Devi
  useEffect(() => {
    async function load() {
      try {
        const fetched = await api.getProfiles(false);
        if (fetched && fetched.length > 0) {
          setProfiles(fetched);
          const active = currentUser || fetched[0];
          setSelectedUser(active);
          
          // Pre-seed Rajesh (1) and Sunita (2) if not already seeded
          const rajesh = fetched.find(p => p.name?.toLowerCase().includes('rajesh') || p.display_name?.toLowerCase().includes('rajesh')) || fetched[0];
          const sunita = fetched.find(p => p.name?.toLowerCase().includes('sunita') || p.display_name?.toLowerCase().includes('sunita')) || (fetched.length > 1 ? fetched[1] : fetched[0]);
          PersonalBaselineEngine.seedDemonstrationBaselines(rajesh.id, sunita.id);
        }
      } catch (err) {
        console.warn('Could not load profiles:', err);
      }
    }
    load();
  }, []);

  const activeUserId = selectedUser ? selectedUser.id : 1;
  const history = PersonalBaselineEngine.getSessionHistory(activeUserId, 'overall');
  const sessionCount = history.length + 1;

  // Handle Switch Profile
  const handleProfileSelect = (user: User) => {
    setSelectedUser(user);
    switchProfile(user);
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
    const approxTouch: TouchBehavioralVector = {
      first_interaction_latency_ms: vVector.response_latency_ms,
      mean_inter_tap_latency_ms: vVector.response_latency_ms,
      response_time_variance: 0.15,
      hesitation_count: vVector.number_of_pauses,
      repeat_error_rate: 0.05,
      correction_rate: 0.05,
      completion_time_ms: vVector.speech_duration_ms + vVector.response_latency_ms,
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
      response_time_variance: 0.10,
      hesitation_count: recallType === 'assisted' ? 2 : 0,
      repeat_error_rate: 0.0,
      correction_rate: recallType === 'assisted' ? 0.3 : 0.0,
      completion_time_ms: latencyMs + 1000,
      accuracy: success ? 1.0 : 0.5,
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
      corrections: Math.round(tVector.correction_rate * tVector.total_taps) || (tVector.accuracy < 0.6 ? 4 : 1),
      repeat_errors: Math.round(tVector.repeat_error_rate * tVector.total_taps) || 0,
      completion_time_ms: tVector.completion_time_ms,
      difficulty: currentDifficulty,
      timestamp: tVector.timestamp,
    };

    const bMetrics = PersonalBaselineEngine.evaluateAgainstBaseline(activeUserId, sessionVector, 'overall');
    setBaselineMetrics(bMetrics);

    // 3. Store in Personal History
    PersonalBaselineEngine.recordSession(activeUserId, sessionVector, 'overall');

    // 4. Determine Real-time Adaptation
    let nextDiff = currentDifficulty;
    if (bMetrics.status === 'MEANINGFUL_DEVIATION' || mlDecision.recommendation === 'DECREASE') {
      nextDiff = Math.max(1, currentDifficulty - 1);
    } else if (mlDecision.recommendation === 'INCREASE' && bMetrics.status === 'NORMAL') {
      nextDiff = Math.min(5, currentDifficulty + 1);
    }
    setAdaptedDifficulty(nextDiff);

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

  const isDeviation = baselineMetrics?.status === 'MEANINGFUL_DEVIATION' || (touchVector && touchVector.accuracy < 0.65);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-between p-4 sm:p-6 select-none font-sans">
      {/* Top Header Bar */}
      <header className="w-full max-w-md flex justify-between items-center py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Link
            to="/caregiver"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Caregiver Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
              iQ
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block leading-tight">MindMitra</span>
              <span className="text-[10px] text-blue-400 font-bold block">iQOO Phone Companion</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/office-kit"
            className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-[11px] font-bold text-white flex items-center gap-1 border border-indigo-400/40"
          >
            <Laptop size={12} />
            <span>Office Kit</span>
          </Link>
          <Link
            to="/judge-demo"
            className="px-2.5 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-[11px] font-black text-slate-950 flex items-center gap-1"
          >
            <Sparkles size={12} />
            <span>Judge Demo</span>
          </Link>
        </div>
      </header>

      {/* Main Screen Container */}
      <main className="w-full max-w-md flex-grow flex flex-col justify-center my-4">
        {step === 'intro' && (
          <div className="flex flex-col animate-in fade-in">
            {/* Active Elderly Profile Selector */}
            {profiles.length > 0 && (
              <div className="mb-4 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">
                    {(selectedUser?.display_name || selectedUser?.name || 'U').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">{selectedUser?.display_name || selectedUser?.name}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">Personal Baseline Active</span>
                  </div>
                </div>

                <select
                  value={selectedUser?.id ?? ''}
                  onChange={(e) => {
                    const u = profiles.find(p => p.id === Number(e.target.value));
                    if (u) handleProfileSelect(u);
                  }}
                  className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-2 py-1 font-bold focus:outline-none"
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name || p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Hero Card: "The phone learns your pattern." */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-800/90 border border-slate-700 shadow-xl text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-[10px] text-blue-300 font-bold mb-3">
                <ShieldCheck size={12} className="text-blue-400" />
                <span>Demo profile — representative historical sessions</span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mx-auto mb-3">
                <Brain size={26} />
              </div>

              <h2 className="text-xl font-black tracking-tight text-white mb-1">
                Learning your pattern
              </h2>
              <p className="text-xs text-slate-400 font-medium mb-5">
                Session {sessionCount} of 10 • On-Device Adaptive Companion
              </p>

              {/* Baseline Summary Metrics */}
              <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 mb-4 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Accuracy</span>
                  <span className="text-base font-extrabold text-emerald-400">91%</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Response</span>
                  <span className="text-base font-extrabold text-blue-400">1.8s</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Corrections</span>
                  <span className="text-base font-extrabold text-purple-400">1</span>
                </div>
              </div>

              {/* Personal Baseline Progress Bar */}
              <div className="text-left mb-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                  <span>Personal baseline</span>
                  <span className="text-blue-400 font-extrabold">{Math.min(100, sessionCount * 10)}% calibrated</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-700/60 overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(25, sessionCount * 10))}%` }}
                  />
                </div>
              </div>
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
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 active:scale-98 transition-all min-h-[48px]"
                >
                  <Mic size={16} className="text-purple-400" />
                  <span>Voice Recall</span>
                </button>

                <button
                  onClick={() => handleStartActivity('camera')}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 active:scale-98 transition-all min-h-[48px]"
                >
                  <Camera size={16} className="text-cyan-400" />
                  <span>Familiar Person</span>
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
            onComplete={handleCameraComplete}
            onCancel={() => setStep('intro')}
          />
        )}

        {/* STEP: On-Device Evaluation & Killer Adaptation Moment */}
        {step === 'evaluation' && (
          <div className="flex flex-col animate-in fade-in">
            {/* 4-Stage Core Adaptive Architecture Status Indicator */}
            <div className="mb-3 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 border-b border-slate-800 pb-1">
                <span className="text-blue-400">Core Adaptation Loop</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/40">LIVE SESSION</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-bold">
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  <span className="text-emerald-400 font-black">✓ [SENSE]</span>
                  <span className="truncate">Touch & Cadence</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  <span className="text-emerald-400 font-black">✓ [LOCAL AI]</span>
                  <span className="truncate">{inferenceResult?.recommendation || 'Evaluated'}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  <span className="text-emerald-400 font-black">✓ [BASELINE]</span>
                  <span className="truncate">{baselineMetrics?.status?.replace('_', ' ') || 'Compared'}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  <span className="text-indigo-400 font-black">⚡ [ADAPT]</span>
                  <span className="truncate">Lvl {adaptedDifficulty}</span>
                </div>
              </div>
            </div>

            {/* On-Device ML Badge */}
            <div className="flex justify-between items-center mb-3 px-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                <Cpu size={14} className="text-emerald-400" />
                <span>On-Device ML: {inferenceResult?.inference_latency_ms}ms</span>
              </div>
              <span className="text-[10px] text-slate-400">100% Edge Processing</span>
            </div>

            {/* Pattern Feedback Card */}
            {isDeviation ? (
              /* DEVIATION STATE */
              <div className="p-6 rounded-3xl bg-slate-800 border-2 border-amber-500/70 shadow-2xl text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto mb-3">
                  <TrendingDown size={28} />
                </div>

                <h3 className="text-lg font-black text-white mb-1">
                  A change from your usual pattern was observed.
                </h3>
                <p className="text-xs text-amber-300/90 font-medium mb-5">
                  Recent interaction differs from your established personal baseline.
                </p>

                {/* The 3 Core Deviation Metrics */}
                <div className="space-y-2 mb-5 text-left">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-bold text-slate-300">Response time</span>
                    <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                      <TrendingUp size={14} /> ↑ 48% (Slower)
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-bold text-slate-300">Corrections</span>
                    <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                      <TrendingUp size={14} /> ↑ 3x (Hesitation)
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-bold text-slate-300">Accuracy</span>
                    <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                      <TrendingDown size={14} /> ↓ 19%
                    </span>
                  </div>
                </div>

                {/* Real-time Adaptation Notice */}
                <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-left mb-2">
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold mb-1">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span>Real-Time Adaptation</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    We will adjust the next activity from Level {currentDifficulty} to Level {adaptedDifficulty} to maintain positive, comforting engagement.
                  </p>
                </div>
              </div>
            ) : (
              /* NORMAL STATE */
              <div className="p-6 rounded-3xl bg-slate-800 border border-emerald-500/50 shadow-xl text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                  <CheckCircle2 size={28} />
                </div>

                <h3 className="text-lg font-black text-white mb-1">
                  Interaction matches your usual pattern.
                </h3>
                <p className="text-xs text-emerald-300/90 font-medium mb-5">
                  Accuracy, cadence, and response latencies align with your personal baseline.
                </p>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 mb-4 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Accuracy</span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {Math.round((touchVector?.accuracy || 0.9) * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Latency</span>
                    <span className="text-sm font-extrabold text-blue-400">
                      {((touchVector?.mean_inter_tap_latency_ms || 1800) / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Next Level</span>
                    <span className="text-sm font-extrabold text-purple-400">
                      Level {adaptedDifficulty}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 text-xs text-slate-300 font-medium text-left">
                  ✨ On-Device decision: {inferenceResult?.recommendation} (Confidence: {Math.round((inferenceResult?.confidence || 0.88) * 100)}%).
                </div>
              </div>
            )}

            {/* Synced to Office Kit Confirmation Pill */}
            {syncedPacket && (
              <div className="p-3 mb-4 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-indigo-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send size={14} className="text-indigo-400" />
                  <span>Approved summary synced to Office Kit</span>
                </div>
                <Link to="/office-kit" className="font-bold underline text-white">
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
                className="w-full py-3 rounded-2xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold"
              >
                Back to Pattern Overview
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Medical Disclaimer */}
      <footer className="w-full max-w-md text-center py-2 border-t border-slate-800/80">
        <p className="text-[10px] text-slate-500 leading-tight">
          ⚠️ Behavioral observation — not a medical diagnosis. MindMitra is a supportive cognitive companion.
        </p>
      </footer>
    </div>
  );
}
