/**
 * MindMitra - Personal Behavioral Baseline & Deviation Engine
 * Evaluates individual interaction patterns exclusively against the individual's own history.
 * Zero cross-profile population leakage.
 *
 * NOTE: Strictly behavioral observation. Never makes medical or neurological diagnoses.
 */

export interface PersonalBaselineMetrics {
  userId: number;
  domain: string;
  eligibleSessionCount: number;
  baselineMedianAccuracy: number;
  baselineMedianLatencyMs: number;
  baselineMedianCorrections: number;
  baselineMedianCompletionTimeMs: number;
  baselineStdDev: number;
  status: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION';
  statusLabel: string;
  trendDescription: string;
  reasonCodes: string[];
  lastUpdated: string;
}

export interface SessionEvidenceVector {
  accuracy: number;
  mean_response_time_ms: number;
  corrections: number;
  repeat_errors: number;
  completion_time_ms: number;
  difficulty: number;
  timestamp: string;
}

const STORAGE_KEY_PREFIX = 'mindmitra_personal_baseline_';
const HISTORY_KEY_PREFIX = 'mindmitra_profile_history_';

export class PersonalBaselineEngine {
  /**
   * Retrieves local recorded session history for a specific profile and domain.
   */
  public static getSessionHistory(userId: number, domain: string = 'overall'): SessionEvidenceVector[] {
    try {
      const key = `${HISTORY_KEY_PREFIX}${userId}_${domain}`;
      const saved = localStorage.getItem(key);
      if (!saved) return [];
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }

  /**
   * Appends an eligible session to the profile's personal history.
   */
  public static recordSession(
    userId: number,
    session: SessionEvidenceVector,
    domain: string = 'overall'
  ): void {
    try {
      const history = this.getSessionHistory(userId, domain);
      history.push(session);
      // Retain last 30 sessions for moving baseline
      const trimmed = history.slice(-30);
      const key = `${HISTORY_KEY_PREFIX}${userId}_${domain}`;
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not store personal session history:', e);
    }
  }

  /**
   * Computes the personal median of an array of numbers.
   */
  private static calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculates standard deviation of a dataset.
   */
  private static calculateStdDev(values: number[], mean: number): number {
    if (values.length <= 1) return 0.05;
    const sumSquares = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
    return Math.sqrt(sumSquares / values.length);
  }

  /**
   * Evaluates the current session against the profile's established personal baseline.
   */
  public static evaluateAgainstBaseline(
    userId: number,
    currentSession: SessionEvidenceVector,
    domain: string = 'overall'
  ): PersonalBaselineMetrics {
    const history = this.getSessionHistory(userId, domain);
    const count = history.length;

    // State 1: Baseline Calibration in Progress (< 3 sessions)
    if (count < 3) {
      return {
        userId,
        domain,
        eligibleSessionCount: count,
        baselineMedianAccuracy: currentSession.accuracy,
        baselineMedianLatencyMs: currentSession.mean_response_time_ms,
        baselineMedianCorrections: currentSession.corrections,
        baselineMedianCompletionTimeMs: currentSession.completion_time_ms,
        baselineStdDev: 0.05,
        status: 'CALIBRATING',
        statusLabel: 'Baseline Calibration in Progress',
        trendDescription: `Learning your usual pattern... (${count} of 5 calibration sessions recorded).`,
        reasonCodes: ['baseline_calibrating'],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Calculate baseline medians from history (prior sessions)
    const accuracies = history.map(s => s.accuracy);
    const latencies = history.map(s => s.mean_response_time_ms);
    const correctionsList = history.map(s => s.corrections);
    const completionTimes = history.map(s => s.completion_time_ms);

    const medianAcc = this.calculateMedian(accuracies);
    const medianLat = this.calculateMedian(latencies);
    const medianCorr = this.calculateMedian(correctionsList);
    const medianComp = this.calculateMedian(completionTimes);
    const stdDevAcc = this.calculateStdDev(accuracies, medianAcc);

    // Multi-signal deviation calculation
    const accDelta = currentSession.accuracy - medianAcc;
    const latencyPctChange = (currentSession.mean_response_time_ms - medianLat) / Math.max(medianLat, 1);
    const corrDelta = currentSession.corrections - medianCorr;

    const reasons: string[] = [];

    // Meaningful Deviation: Multi-signal degradation beyond personal variance
    // Condition: Accuracy drop >= 15% AND (latency increased >= 35% OR corrections tripled)
    const isMeaningful = (
      accDelta <= -0.15 &&
      (latencyPctChange >= 0.35 || corrDelta >= 3 || currentSession.corrections >= 4)
    );

    // Minor Deviation: Slower response or mild drop within tolerance
    const isMinor = (
      (accDelta <= -0.08 && accDelta > -0.15) ||
      (latencyPctChange >= 0.25 && latencyPctChange < 0.35)
    );

    let status: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION' = 'NORMAL';
    let statusLabel = 'Aligned with Personal Pattern';
    let description = 'Performance is stable and aligned with your usual personal pattern.';

    if (isMeaningful) {
      status = 'MEANINGFUL_DEVIATION';
      statusLabel = 'Meaningful Deviation';
      description = 'Recent interaction is outside the established personal baseline.';
      if (accDelta <= -0.15) reasons.push('lower_task_accuracy');
      if (latencyPctChange >= 0.35) reasons.push('slower_response_latency');
      if (corrDelta >= 2) reasons.push('increased_corrections');
    } else if (isMinor) {
      status = 'MINOR_DEVIATION';
      statusLabel = 'Minor Deviation Observed';
      description = 'Slight variation observed compared to recent sessions; continuing regular rhythm.';
      reasons.push('mild_variance_observed');
    } else {
      status = 'NORMAL';
      statusLabel = 'Normal Interaction';
      description = 'Your rhythm, accuracy, and cadence match your established baseline.';
      reasons.push('performance_stable');
    }

    return {
      userId,
      domain,
      eligibleSessionCount: count,
      baselineMedianAccuracy: Math.round(medianAcc * 100) / 100,
      baselineMedianLatencyMs: Math.round(medianLat),
      baselineMedianCorrections: Math.round(medianCorr),
      baselineMedianCompletionTimeMs: Math.round(medianComp),
      baselineStdDev: Math.round(stdDevAcc * 100) / 100,
      status,
      statusLabel,
      trendDescription: description,
      reasonCodes: reasons,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Pre-seeds baseline history for demonstration profiles (e.g. Rajesh Kumar vs Sunita Devi).
   */
  public static seedDemonstrationBaselines(rajeshId: number, sunitaId: number): void {
    // Rajesh Kumar: Stable Baseline (~88% accuracy, 2.0s latency, 1 correction)
    const rajeshHistory: SessionEvidenceVector[] = [
      { accuracy: 0.88, mean_response_time_ms: 2100, corrections: 1, repeat_errors: 0, completion_time_ms: 28000, difficulty: 3, timestamp: '2026-09-08T10:00:00Z' },
      { accuracy: 0.90, mean_response_time_ms: 1950, corrections: 0, repeat_errors: 0, completion_time_ms: 26000, difficulty: 3, timestamp: '2026-09-09T10:00:00Z' },
      { accuracy: 0.85, mean_response_time_ms: 2200, corrections: 1, repeat_errors: 1, completion_time_ms: 30000, difficulty: 3, timestamp: '2026-09-10T10:00:00Z' },
      { accuracy: 0.92, mean_response_time_ms: 1850, corrections: 0, repeat_errors: 0, completion_time_ms: 25000, difficulty: 4, timestamp: '2026-09-11T10:00:00Z' },
      { accuracy: 0.87, mean_response_time_ms: 2050, corrections: 1, repeat_errors: 0, completion_time_ms: 29000, difficulty: 4, timestamp: '2026-09-12T10:00:00Z' },
      { accuracy: 0.89, mean_response_time_ms: 2000, corrections: 1, repeat_errors: 0, completion_time_ms: 27000, difficulty: 4, timestamp: '2026-09-13T10:00:00Z' },
    ];
    localStorage.setItem(`${HISTORY_KEY_PREFIX}${rajeshId}_overall`, JSON.stringify(rajeshHistory));

    // Sunita Devi: Baseline (~84% accuracy, 2.1s latency, 2 corrections)
    const sunitaHistory: SessionEvidenceVector[] = [
      { accuracy: 0.85, mean_response_time_ms: 2150, corrections: 2, repeat_errors: 1, completion_time_ms: 32000, difficulty: 3, timestamp: '2026-09-08T11:00:00Z' },
      { accuracy: 0.86, mean_response_time_ms: 2050, corrections: 1, repeat_errors: 0, completion_time_ms: 31000, difficulty: 3, timestamp: '2026-09-09T11:00:00Z' },
      { accuracy: 0.83, mean_response_time_ms: 2200, corrections: 2, repeat_errors: 1, completion_time_ms: 33000, difficulty: 3, timestamp: '2026-09-10T11:00:00Z' },
      { accuracy: 0.84, mean_response_time_ms: 2100, corrections: 2, repeat_errors: 0, completion_time_ms: 32000, difficulty: 3, timestamp: '2026-09-11T11:00:00Z' },
      { accuracy: 0.82, mean_response_time_ms: 2300, corrections: 2, repeat_errors: 1, completion_time_ms: 34000, difficulty: 3, timestamp: '2026-09-12T11:00:00Z' },
    ];
    localStorage.setItem(`${HISTORY_KEY_PREFIX}${sunitaId}_overall`, JSON.stringify(sunitaHistory));
  }
}
