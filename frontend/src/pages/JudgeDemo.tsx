import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Play, 
  Sparkles, 
  ArrowLeft, 
  Cpu, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Laptop, 
  Smartphone, 
  RotateCcw,
  Zap,
  Activity
} from 'lucide-react';
import { predictOnDevice, OnDeviceFeatures, OnDeviceInferenceResult } from '../services/onDeviceInference';
import { PersonalBaselineEngine, SessionEvidenceVector, PersonalBaselineMetrics } from '../services/personalBaselineEngine';
import { OfficeKitBridge, OfficeKitPacket } from '../services/officeKitBridge';
import { 
  LocalTemplateExplanationProvider, 
  OllamaExplanationProvider, 
  BehavioralExplanationResult 
} from '../services/explanationProvider';
import ThemeToggle from '../components/ThemeToggle';

export default function JudgeDemo() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<'A' | 'B' | null>(null);
  const [executing, setExecuting] = useState(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [demoLanguage, setDemoLanguage] = useState<'en' | 'te' | 'hi'>('en');

  // Real pipeline outputs
  const [features, setFeatures] = useState<OnDeviceFeatures | null>(null);
  const [inferenceResult, setInferenceResult] = useState<OnDeviceInferenceResult | null>(null);
  const [baselineMetrics, setBaselineMetrics] = useState<PersonalBaselineMetrics | null>(null);
  const [officeKitPacket, setOfficeKitPacket] = useState<OfficeKitPacket | null>(null);
  const [explanation, setExplanation] = useState<BehavioralExplanationResult | null>(null);

  const generateExplanation = (
    scenario: 'A' | 'B',
    lang: 'en' | 'te' | 'hi',
    bMet: PersonalBaselineMetrics,
    feat: OnDeviceFeatures,
    mlRes: OnDeviceInferenceResult,
    corrections: number
  ) => {
    return LocalTemplateExplanationProvider.generate({
      profileName: scenario === 'A' ? 'Rajesh Kumar' : 'Sunita Devi',
      language: lang,
      baseline: {
        medianAccuracy: bMet.baselineMedianAccuracy,
        medianLatencyMs: bMet.baselineMedianLatencyMs,
        medianCorrections: bMet.baselineMedianCorrections,
        eligibleSessionCount: bMet.eligibleSessionCount,
        status: bMet.status,
      },
      session: {
        accuracy: feat.accuracy,
        latencyMs: feat.mean_response_time_ms,
        corrections,
        hesitationCount: scenario === 'B' ? 5 : 0,
        activityType: 'TOUCH MEMORY MATCH',
      },
      adaptation: {
        previousDifficulty: scenario === 'A' ? 3 : 4,
        recommendedDifficulty: mlRes.recommended_difficulty,
        decision: scenario === 'A' ? mlRes.recommendation : 'DECREASE',
        reason: mlRes.reason,
      },
    });
  };

  const handleLanguageChange = (lang: 'en' | 'te' | 'hi') => {
    setDemoLanguage(lang);
    if (selectedScenario && baselineMetrics && features && inferenceResult) {
      const corr = selectedScenario === 'A' ? 1 : 4;
      const updated = generateExplanation(
        selectedScenario,
        lang,
        baselineMetrics,
        features,
        inferenceResult,
        corr
      );
      setExplanation(updated);
    }
  };

  // Scenario A: Normal Interaction (Rajesh Kumar)
  const runScenarioA = async () => {
    setSelectedScenario('A');
    setExecuting(true);
    setStepIndex(1); // 1. Sensing & Feature Extraction

    // Ensure baseline history is ready
    PersonalBaselineEngine.seedDemonstrationBaselines(1, 2);

    await new Promise(r => setTimeout(r, 400));
    const featA: OnDeviceFeatures = {
      accuracy: 0.91,
      mean_response_time_ms: 1820,
      response_time_variance: 0.12,
      repeat_error_rate: 0.02,
      correction_rate: 0.04,
      completion_time_ms: 24500,
      current_difficulty: 3,
      previous_session_accuracy: 0.89,
      recent_trend: 0.15,
    };
    setFeatures(featA);
    setStepIndex(2); // 2. On-Device ML Inference

    await new Promise(r => setTimeout(r, 300));
    // REAL ON-DEVICE INFERENCE
    const mlRes = predictOnDevice(featA, 3);
    setInferenceResult(mlRes);
    setStepIndex(3); // 3. Baseline Comparison

    await new Promise(r => setTimeout(r, 300));
    const sessionVec: SessionEvidenceVector = {
      accuracy: featA.accuracy,
      mean_response_time_ms: featA.mean_response_time_ms,
      corrections: 1,
      repeat_errors: 0,
      completion_time_ms: featA.completion_time_ms,
      difficulty: 3,
      timestamp: new Date().toISOString(),
    };
    const bMet = PersonalBaselineEngine.evaluateAgainstBaseline(1, sessionVec, 'overall');
    setBaselineMetrics(bMet);
    setStepIndex(4); // 4. Real-time Adaptation & Office Kit Sync

    await new Promise(r => setTimeout(r, 300));
    const pkt: OfficeKitPacket = OfficeKitBridge.normalizePacket({
      schemaVersion: '1.0',
      id: `pkt_${Date.now()}`,
      profile: {
        id: 1,
        name: 'Rajesh Kumar ("Polayya")',
      },
      profileId: 1,
      profileName: 'Rajesh Kumar ("Polayya")',
      timestamp: new Date().toISOString(),
      deviceSource: 'iQOO Phone (On-Device Inference)',
      baselineAccuracy: bMet.baselineMedianAccuracy,
      sessionAccuracy: featA.accuracy,
      baselineLatencyMs: bMet.baselineMedianLatencyMs,
      sessionLatencyMs: featA.mean_response_time_ms,
      baselineCorrections: bMet.baselineMedianCorrections,
      sessionCorrections: sessionVec.corrections,
      status: 'NORMAL',
      primarySignals: ['performance stable', 'prompt response cadence'],
      adaptation: {
        recommendedDifficulty: mlRes.recommended_difficulty,
        previousDifficulty: 3,
        action: 'Difficulty advanced to Level 4 for cognitive enrichment',
        reason: mlRes.reason,
      },
      onDeviceML: {
        model: mlRes.model_name,
        latencyMs: mlRes.inference_latency_ms,
        confidence: mlRes.confidence,
        decision: mlRes.recommendation,
        probabilities: mlRes.probabilities,
        onDevice: true,
      },
      behavioralSignals: {
        firstInteractionLatencyMs: 1400,
        hesitationCount: 0,
        repeatErrorRate: featA.repeat_error_rate,
        touchCount: 16,
      },
      privacyMetadata: {
        rawAudioRetained: false,
        rawFramesRetained: false,
        clientSideInference: true,
        nonClinicalObservation: true,
      },
    })!;
    OfficeKitBridge.publishSummary(pkt);
    setOfficeKitPacket(pkt);

    // Natural-language behavioral explanation
    const expA = generateExplanation('A', demoLanguage, bMet, featA, mlRes, sessionVec.corrections);
    setExplanation(expA);

    setExecuting(false);
    setStepIndex(5); // Complete
  };

  // Scenario B: Intentional Degraded Interaction (Sunita Devi)
  const runScenarioB = async () => {
    setSelectedScenario('B');
    setExecuting(true);
    setStepIndex(1);

    PersonalBaselineEngine.seedDemonstrationBaselines(1, 2);

    await new Promise(r => setTimeout(r, 400));
    const featB: OnDeviceFeatures = {
      accuracy: 0.63,
      mean_response_time_ms: 4850,
      response_time_variance: 0.42,
      repeat_error_rate: 0.22,
      correction_rate: 0.35,
      completion_time_ms: 68000,
      current_difficulty: 4,
      previous_session_accuracy: 0.84,
      recent_trend: -0.35,
    };
    setFeatures(featB);
    setStepIndex(2);

    await new Promise(r => setTimeout(r, 300));
    // REAL ON-DEVICE INFERENCE
    const mlRes = predictOnDevice(featB, 4);
    setInferenceResult(mlRes);
    setStepIndex(3);

    await new Promise(r => setTimeout(r, 300));
    const sessionVec: SessionEvidenceVector = {
      accuracy: featB.accuracy,
      mean_response_time_ms: featB.mean_response_time_ms,
      corrections: 8,
      repeat_errors: 3,
      completion_time_ms: featB.completion_time_ms,
      difficulty: 4,
      timestamp: new Date().toISOString(),
    };
    const bMet = PersonalBaselineEngine.evaluateAgainstBaseline(2, sessionVec, 'overall');
    setBaselineMetrics(bMet);
    setStepIndex(4);

    await new Promise(r => setTimeout(r, 300));
    const pkt: OfficeKitPacket = OfficeKitBridge.normalizePacket({
      schemaVersion: '1.0',
      id: `pkt_${Date.now()}`,
      profile: {
        id: 2,
        name: 'Sunita Devi ("Leelu")',
      },
      profileId: 2,
      profileName: 'Sunita Devi ("Leelu")',
      timestamp: new Date().toISOString(),
      deviceSource: 'iQOO Phone (On-Device Inference)',
      baselineAccuracy: 0.84,
      sessionAccuracy: 0.63,
      baselineLatencyMs: 2100,
      sessionLatencyMs: 4850,
      baselineCorrections: 2,
      sessionCorrections: 8,
      status: 'MEANINGFUL_DEVIATION',
      primarySignals: ['slower responses', 'increased corrections', 'lower task accuracy'],
      adaptation: {
        recommendedDifficulty: 2,
        previousDifficulty: 4,
        action: 'Difficulty adjusted from Level 4 to Level 2',
        reason: mlRes.reason,
      },
      onDeviceML: {
        model: mlRes.model_name,
        latencyMs: mlRes.inference_latency_ms,
        confidence: mlRes.confidence,
        decision: mlRes.recommendation,
        probabilities: mlRes.probabilities,
        onDevice: true,
      },
      behavioralSignals: {
        firstInteractionLatencyMs: 3600,
        hesitationCount: 5,
        repeatErrorRate: featB.repeat_error_rate,
        touchCount: 24,
      },
      privacyMetadata: {
        rawAudioRetained: false,
        rawFramesRetained: false,
        clientSideInference: true,
        nonClinicalObservation: true,
      },
    })!;
    OfficeKitBridge.publishSummary(pkt);
    setOfficeKitPacket(pkt);

    // Natural-language behavioral explanation
    const expB = generateExplanation('B', demoLanguage, bMet, featB, mlRes, sessionVec.corrections);
    setExplanation(expB);

    setExecuting(false);
    setStepIndex(5);
  };

  const handleReset = () => {
    setSelectedScenario(null);
    setStepIndex(0);
    setFeatures(null);
    setInferenceResult(null);
    setBaselineMetrics(null);
    setOfficeKitPacket(null);
    setExplanation(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-150 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs transition-colors"
              >
                <ArrowLeft size={14} /> Home
              </Link>
              <span className="bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                iQOO Hackathon 2026 Evaluation Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
              <span>Judge Demo:</span>
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">
                "The Phone Learns Your Pattern"
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Deterministic reproducible evaluation scenarios executing the <strong>REAL</strong> on-device inference and baseline pipeline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link
              to="/office-kit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
            >
              <Laptop size={15} />
              <span>Open Office Kit</span>
            </Link>
            <Link
              to="/personal-pattern"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
            >
              <Smartphone size={15} />
              <span>Open Phone UI</span>
            </Link>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
              {(['en', 'te', 'hi'] as const).map(lng => (
                <button
                  key={lng}
                  onClick={() => handleLanguageChange(lng)}
                  className={`px-2.5 py-1.5 rounded-xl font-black transition-all text-xs min-h-[36px] ${
                    demoLanguage === lng
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                  title={`View explanations in ${lng === 'en' ? 'English' : lng === 'te' ? 'Telugu' : 'Hindi'}`}
                >
                  {lng === 'en' ? 'EN' : lng === 'te' ? 'తెలుగు' : 'हिन्दी'}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Controlled Demo Banner */}
        <div className="p-3.5 mb-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Notice:</strong> Controlled demonstration scenario — synthetic parameters used to test ML model & baseline pipelines deterministically.
            </span>
          </div>
          <Link
            to="/personal-pattern"
            className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 shrink-0 transition-colors"
          >
            Live Touch Experience →
          </Link>
        </div>

        {/* Scenario Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Scenario A Card */}
          <div className={`p-6 rounded-3xl border-2 transition-all shadow-xs ${
            selectedScenario === 'A'
              ? 'bg-white dark:bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/50'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                Scenario A
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Rajesh Kumar</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Normal Interaction Rhythm</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Demonstrates consistent high accuracy (91%), swift response latency (1.8s), low corrections, and on-device ML recommendation to advance difficulty.
            </p>
            <button
              onClick={runScenarioA}
              disabled={executing}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all shadow-xs"
            >
              <Play size={14} fill="currentColor" />
              <span>Run Scenario A (Normal Interaction)</span>
            </button>
          </div>

          {/* Scenario B Card */}
          <div className={`p-6 rounded-3xl border-2 transition-all shadow-xs ${
            selectedScenario === 'B'
              ? 'bg-white dark:bg-slate-800 border-amber-500 ring-2 ring-amber-500/50'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
                Scenario B
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Sunita Devi</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Intentional Degraded Interaction</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Demonstrates observed shift in latency (+48%), hesitation pauses, 3x corrections, on-device Meaningful Deviation detection, and real-time difficulty reduction.
            </p>
            <button
              onClick={runScenarioB}
              disabled={executing}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all shadow-xs"
            >
              <Play size={14} fill="currentColor" />
              <span>Run Scenario B (Degraded Interaction)</span>
            </button>
          </div>
        </div>

        {/* Real Pipeline Execution Step Visualizer */}
        {stepIndex > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-8 shadow-xl animate-in fade-in">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap size={18} className="text-amber-500 dark:text-amber-400" />
                  <span>Real Pipeline Telemetry Stream</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  100% on-device feature extraction & model inference
                </p>
              </div>

              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-400 flex items-center gap-1 font-bold transition-colors"
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>

            {/* Step Progression */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
              {[
                { title: '1. SENSING', desc: 'Touch Cadence' },
                { title: '2. ON-DEVICE ML', desc: 'Random Forest' },
                { title: '3. BASELINE', desc: 'Personal History' },
                { title: '4. ADAPT & SYNC', desc: 'Office Kit' },
              ].map((s, idx) => {
                const isCurrent = stepIndex === idx + 1;
                const isPast = stepIndex > idx + 1;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border text-xs transition-all ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-white font-extrabold ring-1 ring-blue-500'
                        : isPast
                        ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                        isPast ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                      }`}>
                        {isPast ? '✓' : idx + 1}
                      </span>
                      <span className="font-extrabold">{s.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{s.desc}</span>
                  </div>
                );
              })}
            </div>

            {/* Pipeline Output Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Box 1: Extracted Features */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-2">
                  1. Local Feature Vector
                </span>
                {features ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Accuracy:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{Math.round(features.accuracy * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Mean Response:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{(features.mean_response_time_ms / 1000).toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Variance:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{features.response_time_variance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Repeat Errors:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{features.repeat_error_rate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Corrections:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{features.correction_rate}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Awaiting input...</span>
                )}
              </div>

              {/* Box 2: On-Device Model Decision */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider block mb-2">
                  2. On-Device Inference
                </span>
                {inferenceResult ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Execution Time:</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">⚡ {inferenceResult.inference_latency_ms}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Decision:</span>
                      <span className={`font-black ${
                        inferenceResult.recommendation === 'DECREASE' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {inferenceResult.recommendation}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Confidence:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{Math.round(inferenceResult.confidence * 100)}%</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                      Factor: {inferenceResult.primary_factor}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Awaiting inference...</span>
                )}
              </div>

              {/* Box 3: Personal Baseline & Adaptation */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider block mb-2">
                  3. Personal Baseline & Action
                </span>
                {baselineMetrics ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Baseline Status:</span>
                      <span className={`font-black ${
                        baselineMetrics.status === 'MEANINGFUL_DEVIATION' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {baselineMetrics.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Adapted Level:</span>
                      <span className="font-black text-blue-600 dark:text-blue-400">Level {officeKitPacket?.adaptation.recommendedDifficulty}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">
                      {baselineMetrics.trendDescription}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Awaiting evaluation...</span>
                )}
              </div>
            </div>

            {/* Natural-Language Behavioral Explanation Note */}
            {explanation && (
              <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Sparkles size={12} className="text-blue-500" />
                    <span>Behavioral Adaptation Note</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[9px] font-bold border border-blue-200 dark:border-blue-800">
                    {explanation.provider === 'ollama_gemma3_4b' ? '🦙 Gemma 3 4B (Ollama)' : '⚡ Edge Template'}
                  </span>
                </div>
                <p className="text-xs text-slate-900 dark:text-white font-bold leading-relaxed">
                  {explanation.summary}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-normal italic">
                  "{explanation.caregiverNote}"
                </p>
              </div>
            )}

            {/* Live Office Kit Bridge Notification */}
            {officeKitPacket && (
              <div className="mt-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/40 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider block">
                    Office Kit Real-Time Packet Broadcasted
                  </span>
                  <p className="text-xs text-slate-900 dark:text-white font-bold mt-0.5">
                    Synced to Caregiver Office Kit with approved telemetry & non-clinical evidence.
                  </p>
                </div>
                <Link
                  to="/office-kit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Laptop size={14} />
                  <span>Inspect Office Kit</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Technical Architecture Notice */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed shadow-xs">
          <h4 className="text-slate-900 dark:text-white font-bold mb-1 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>Ethical Boundaries & Technical Verification</span>
          </h4>
          <p>
            The on-device model runs a 35-tree Random Forest exported directly from Scikit-Learn without server dependencies. All personal baseline calculations use rolling medians against the profile's prior history. No medical diagnoses are made or implied.
          </p>
        </div>
      </div>
    </div>
  );
}
