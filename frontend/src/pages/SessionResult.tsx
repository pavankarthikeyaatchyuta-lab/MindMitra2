import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Activity, 
  Brain, 
  Volume2,
  Camera,
  CameraOff,
  Eye,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useApp } from '../context/AppContext';
import { VoiceService } from '../services/voiceService';
import { useTranslation } from '../i18n';
import { VisualBehavioralMetrics } from '../services/visualBehavioralTracker';
import { PersonalBaselineEngine } from '../services/personalBaselineEngine';

interface SessionResultData {
  hasValidData: boolean;
  activityTitle: string;
  gameType: string;
  accuracy: number | null;
  avgResponseTimeMs: number | null;
  corrections: number | null;
  studyDurationMs: number | null;
  firstLatencyMs: number | null;
  mismatches: number | null;
  consistency: string;
  patternVerdict: string;
  nextDifficulty: number | null;
  previousDifficulty: number | null;
  adaptationAction: string;
  adaptationReason: string;
  onDeviceLatencyMs: number | null;
  visualMetrics?: VisualBehavioralMetrics | null;
}

export default function SessionResult() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useApp();
  const { language } = useTranslation();

  const [result, setResult] = useState<SessionResultData | null>(null);

  useEffect(() => {
    // Strictly load real-time measured session metrics from sessionStorage
    const savedMetricsStr = sessionStorage.getItem('mindmitra_last_metrics');
    const savedAdaptiveStr = sessionStorage.getItem('mindmitra_last_adaptive');

    if (!savedMetricsStr) {
      setResult({
        hasValidData: false,
        activityTitle: 'Activity Result',
        gameType: id || 'memory',
        accuracy: null,
        avgResponseTimeMs: null,
        corrections: null,
        studyDurationMs: null,
        firstLatencyMs: null,
        mismatches: null,
        consistency: 'Not available',
        patternVerdict: 'No session data recorded yet.',
        nextDifficulty: null,
        previousDifficulty: null,
        adaptationAction: 'Difficulty maintained',
        adaptationReason: 'No prior interaction recorded.',
        onDeviceLatencyMs: null,
        visualMetrics: null,
      });
      return;
    }

    let metrics: any = null;
    let adaptive: any = null;

    try {
      metrics = JSON.parse(savedMetricsStr);
      if (savedAdaptiveStr) adaptive = JSON.parse(savedAdaptiveStr);
    } catch {
      setResult(null);
      return;
    }

    // Parse strictly measured metrics without fake fallbacks
    const rawAccuracy = typeof metrics?.accuracy === 'number' && !isNaN(metrics.accuracy) ? metrics.accuracy : null;
    const rawLatency = typeof metrics?.avg_response_time_ms === 'number' && !isNaN(metrics.avg_response_time_ms) ? metrics.avg_response_time_ms : null;
    const rawCorrections = typeof metrics?.corrections === 'number' ? metrics.corrections : (typeof metrics?.mismatches === 'number' ? metrics.mismatches : null);
    const studyMs = typeof metrics?.study_duration_ms === 'number' ? metrics.study_duration_ms : null;
    const firstLatMs = typeof metrics?.first_interaction_latency_ms === 'number' ? metrics.first_interaction_latency_ms : null;
    const mismatchesCount = typeof metrics?.mismatches === 'number' ? metrics.mismatches : null;
    const visual = metrics?.visual_metrics ?? null;

    const titleMap: Record<string, string> = {
      memory_match: 'Memory Match',
      memory: 'Memory Match',
      daily_routine: 'Daily Routine Recall',
      routine: 'Daily Routine Recall',
      object_recognition: 'Visual Recall',
      recognition: 'Visual Recall',
      pattern_recall: 'Pattern Recall',
      pattern: 'Pattern Recall',
      voice_recall: 'Voice Recall',
      voice: 'Voice Recall',
    };

    const gameTypeKey = metrics?.game_type || id || 'memory';
    const activityTitle = titleMap[gameTypeKey] || 'Cognitive Activity';

    // Derive Personal Pattern & Baseline Status dynamically from PersonalBaselineEngine
    const uid = currentUser?.id || 1;
    const domain = gameTypeKey === 'daily_routine' ? 'routine' : gameTypeKey === 'memory_match' ? 'memory' : gameTypeKey;
    
    let consistency = 'Calibrating';
    let patternVerdict = 'Observing and learning your individual rhythm.';

    if (rawAccuracy !== null && rawLatency !== null) {
      const baselineEval = PersonalBaselineEngine.evaluateAgainstBaseline(
        uid,
        {
          accuracy: rawAccuracy,
          mean_response_time_ms: rawLatency,
          corrections: rawCorrections || 0,
          repeat_errors: metrics?.repeat_errors || 0,
          completion_time_ms: metrics?.completion_time_ms || 0,
          difficulty: metrics?.difficulty || 1,
          timestamp: new Date().toISOString(),
        },
        domain
      );

      if (baselineEval.status === 'CALIBRATING') {
        consistency = `Calibrating (${baselineEval.eligibleSessionCount}/3)`;
        patternVerdict = baselineEval.trendDescription || 'Learning your personal rhythm across initial sessions.';
      } else if (baselineEval.status === 'NORMAL') {
        consistency = 'Stable';
        patternVerdict = baselineEval.trendDescription || 'Your interaction pattern aligns with your personal baseline.';
      } else if (baselineEval.status === 'MINOR_DEVIATION') {
        consistency = 'Minor Variation';
        patternVerdict = baselineEval.trendDescription || 'Slight variation noted today; pacing was kept gentle.';
      } else if (baselineEval.status === 'MEANINGFUL_DEVIATION') {
        consistency = 'Variable';
        patternVerdict = baselineEval.trendDescription || 'Response latency differed from your usual range.';
      }
    }

    const prevDiff = typeof metrics?.difficulty === 'number' ? metrics.difficulty : null;
    const nextDiff = typeof adaptive?.recommended_difficulty === 'number' ? adaptive.recommended_difficulty : prevDiff;
    let action = 'Difficulty maintained';
    let reason = adaptive?.reason ?? (consistency.includes('Calibrating') ? 'Calibrating baseline comfort level across initial sessions.' : 'Response pacing aligned with comfortable baseline range.');

    if (nextDiff !== null && prevDiff !== null) {
      if (nextDiff > prevDiff) {
        action = 'Difficulty increased slightly';
      } else if (nextDiff < prevDiff) {
        action = 'Difficulty adjusted to maintain comfort';
      }
    }

    const finalResult: SessionResultData = {
      hasValidData: true,
      activityTitle,
      gameType: gameTypeKey,
      accuracy: rawAccuracy !== null ? Math.round(rawAccuracy * 100) : null,
      avgResponseTimeMs: rawLatency,
      corrections: rawCorrections,
      studyDurationMs: studyMs,
      firstLatencyMs: firstLatMs,
      mismatches: mismatchesCount,
      consistency,
      patternVerdict,
      nextDifficulty: nextDiff,
      previousDifficulty: prevDiff,
      adaptationAction: action,
      adaptationReason: reason,
      onDeviceLatencyMs: typeof adaptive?.inference_latency_ms === 'number' ? adaptive.inference_latency_ms : null,
      visualMetrics: visual,
    };

    setResult(finalResult);

    // Audio summary
    if (finalResult.hasValidData) {
      const accPhrase = finalResult.accuracy !== null ? `Accuracy ${finalResult.accuracy} percent.` : '';
      const spokenText = `${finalResult.activityTitle} complete. ${accPhrase} Pattern status: ${finalResult.consistency}. ${finalResult.patternVerdict}`;
      VoiceService.speak(spokenText, language, true);
    }
  }, [id, language, currentUser]);

  if (!result || !result.hasValidData) {
    return (
      <AppLayout mode="user">
        <div className="max-w-md mx-auto card p-8 text-center my-12">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-4">
            <Brain size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Recent Activity Session
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Complete a cognitive activity to observe your real-time response rhythm and personal pattern.
          </p>
          <Link
            to="/activities"
            className="elderly-btn-primary py-3 px-6 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-bold"
          >
            <span>Choose an Activity</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </AppLayout>
    );
  }

  const handleSpeakResults = () => {
    const accPart = result.accuracy !== null ? `Accuracy was ${result.accuracy} percent.` : '';
    const rtPart = result.avgResponseTimeMs !== null ? `Response time was ${(result.avgResponseTimeMs / 1000).toFixed(1)} seconds.` : '';
    const text = `${result.activityTitle} complete. ${accPart} ${rtPart} Pattern status: ${result.patternVerdict} ${result.adaptationReason}`;
    VoiceService.speak(text, language, true);
  };

  const hasStudyMetric = result.studyDurationMs !== null;

  return (
    <AppLayout mode="user">
      <div className="max-w-xl mx-auto w-full flex flex-col gap-3.5 sm:gap-5 animate-in fade-in">
        {/* Celebration Header */}
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-xs">
            <CheckCircle2 size={26} className="sm:w-8 sm:h-8" />
          </div>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <span className="text-[11px] sm:text-xs uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400">
              Activity Complete
            </span>
            <button
              onClick={handleSpeakResults}
              className="p-1 rounded-full text-slate-400 hover:text-emerald-600"
              title="Listen to summary"
              aria-label="Listen to activity summary"
            >
              <Volume2 size={15} />
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {result.activityTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Behavioral signals successfully recorded and calibrated
          </p>
        </div>

        {/* Behavioral Metrics Grid */}
        <div className="card p-3.5 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm">
          <div className={`grid ${hasStudyMetric ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-2 sm:gap-3 text-center mb-3 sm:mb-4`}>
            {/* Accuracy */}
            <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-0.5 sm:mb-1 truncate">
                Accuracy
              </span>
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {result.accuracy !== null ? `${result.accuracy}%` : 'Not available'}
              </span>
            </div>

            {/* Response Time */}
            <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-0.5 sm:mb-1 truncate">
                Response
              </span>
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400">
                {result.avgResponseTimeMs !== null ? `${(result.avgResponseTimeMs / 1000).toFixed(1)}s` : 'Not available'}
              </span>
            </div>

            {/* Optional Study Time (Memory Match observation duration) */}
            {hasStudyMetric && (
              <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-indigo-700 dark:text-indigo-300 block mb-0.5 sm:mb-1 truncate flex items-center justify-center gap-1">
                  <Eye size={12} />
                  <span>Study Time</span>
                </span>
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {result.studyDurationMs !== null ? `${(result.studyDurationMs / 1000).toFixed(1)}s` : '—'}
                </span>
              </div>
            )}

            {/* Consistency */}
            <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-0.5 sm:mb-1 truncate">
                Consistency
              </span>
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-800 dark:text-slate-200 flex items-center justify-center h-7 sm:h-9">
                {result.consistency}
              </span>
            </div>
          </div>

          {/* Additional Detail Row for Memory Match */}
          {hasStudyMetric && (
            <div className="grid grid-cols-2 gap-2 mb-3.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-bold">Mismatches / Errors:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {result.mismatches !== null ? result.mismatches : (result.corrections ?? 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-bold">First Card Latency:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {result.firstLatencyMs !== null ? `${(result.firstLatencyMs / 1000).toFixed(1)}s` : '—'}
                </span>
              </div>
            </div>
          )}

          {/* Your Pattern Card */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 mb-3.5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
              <Activity size={14} />
              <span>Your Personal Pattern</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
              {result.patternVerdict}
            </p>
          </div>

          {/* Genuine Multimodal Visual Behavioral Sensor Signals */}
          {result.visualMetrics && result.visualMetrics.face_detected_ratio !== null ? (
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 mb-3.5 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Camera size={14} className="text-emerald-500" />
                  Visual Behavioral Sensor Signals
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 font-bold">
                  On-Device Volatile
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold">Face Presence</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {Math.round((result.visualMetrics.face_detected_ratio || 0) * 100)}% frames
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold">Orientation</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {result.visualMetrics.orientation_stability !== null && result.visualMetrics.orientation_stability >= 0.65 ? 'Stable' : 'Varied'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block font-bold">Visual Hesitation</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {((result.visualMetrics.visual_hesitation_ms || 0) / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-0.5">
                {result.visualMetrics.status_summary || 'Behavioral presence observed in local volatile memory. Zero recordings stored.'}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 mb-3.5 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CameraOff size={14} className="text-slate-400" />
                <span>Camera Sensor: Optional / Inactive</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Touch & Cadence Recorded</span>
            </div>
          )}

          {/* Next Activity & Why */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-left">
            <div>
              <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">
                Next Activity Adaptation
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {result.adaptationAction}
                {result.nextDifficulty !== null ? ` (Level ${result.nextDifficulty})` : ''}
              </span>
            </div>

            <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                Why?
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                {result.adaptationReason}
              </p>
            </div>
          </div>

          {/* On-Device ML Tag */}
          <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Cpu size={14} className="text-emerald-500" />
              <span>On-Device Decision Tree</span>
            </div>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {result.onDeviceLatencyMs !== null ? `⚡ ${result.onDeviceLatencyMs}ms` : '⚡ Measured On-Device'}
            </span>
          </div>
        </div>

        {/* Primary Navigation Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/my-pattern"
            className="elderly-btn-secondary text-sm font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2"
          >
            <Activity size={18} />
            <span>View My Pattern</span>
          </Link>

          <Link
            to="/activities"
            className="elderly-btn-primary text-sm font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2"
          >
            <span>Play Next Activity</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
