import { PersonalMemoryDB, StoredBaseline, StoredSessionEvidence } from './personalMemoryDB';

export interface PersonalBaselineMetrics {
  userId: number;
  domain: string;
  eligibleSessionCount: number;
  baselineMedianAccuracy: number;
  baselineMedianLatencyMs: number;
  baselineMedianCorrections: number;
  baselineMedianCompletionTimeMs: number;
  baselineStdDev: number;
  baselineRobustStdDev: number; // MAD * 1.4826 (outlier-resilient dispersion)
  baselineMedianHoldDurationMs?: number;
  baselineMedianHesitations?: number;
  status: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION';
  statusLabel: string;
  trendDescription: string;
  reasonCodes: string[];
  lastUpdated: string;
}

export interface SessionEvidenceVector {
  accuracy: number;
  mean_response_time_ms: number | null;
  corrections: number;
  repeat_errors: number;
  completion_time_ms: number | null;
  difficulty: number;
  hesitation_count?: number;
  micro_hesitation_count?: number;
  macro_hesitation_count?: number;
  mean_hold_duration_ms?: number | null;
  response_time_variance?: number | null;
  timestamp: string;
}

// Named Baseline & Multi-Signal Deviation Thresholds
export const BASELINE_THRESHOLDS = {
  MIN_CALIBRATION_SESSIONS: 3,
  MEANINGFUL_ACCURACY_DROP: -0.15, // Drop >= 15% from personal median
  MEANINGFUL_LATENCY_INCREASE_PCT: 0.35, // Slower by >= 35%
  MEANINGFUL_CORRECTIONS_DELTA: 2, // At least 2 more corrections than median
  MEANINGFUL_CORRECTIONS_ABSOLUTE: 4, // 4 or more corrections in a session
  MEANINGFUL_HESITATION_THRESHOLD: 3, // 3 or more extended hesitation pauses
  MINOR_ACCURACY_DROP: -0.08, // Mild drop >= 8%
  MINOR_LATENCY_INCREASE_PCT: 0.25, // Slower by >= 25%
} as const;

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
      let list: SessionEvidenceVector[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }

      // If querying 'overall' and specific overall list is empty, search across all domains for this user
      if (domain === 'overall' && list.length === 0) {
        const seen = new Set<string>();
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`${HISTORY_KEY_PREFIX}${userId}_`)) {
            const val = localStorage.getItem(k);
            if (val) {
              try {
                const arr = JSON.parse(val);
                if (Array.isArray(arr)) {
                  arr.forEach(item => {
                    const idKey = item.timestamp + '_' + (item.accuracy || 0);
                    if (!seen.has(idKey)) {
                      seen.add(idKey);
                      list.push(item);
                    }
                  });
                }
              } catch {}
            }
          }
        }
        list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
      return list;
    } catch {
      return [];
    }
  }

  /**
   * Clears session history for a profile (e.g. for re-calibration or testing).
   */
  public static clearSessionHistory(userId: number, domain: string = 'overall'): void {
    try {
      const key = `${HISTORY_KEY_PREFIX}${userId}_${domain}`;
      localStorage.removeItem(key);
    } catch {}
  }

  /**
   * Appends an eligible session to the profile's personal history.
   */
  /**
   * Appends an eligible session to the profile's personal history.
   * Persists to synchronous local storage and IndexedDB PersonalMemoryDB.
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

      // Calculate baseline and persist to PersonalMemoryDB in background
      const baseline = this.evaluateAgainstBaseline(userId, session, domain);
      PersonalMemoryDB.recordSession({
        userId,
        domain,
        accuracy: session.accuracy,
        mean_response_time_ms: session.mean_response_time_ms,
        corrections: session.corrections,
        repeat_errors: session.repeat_errors,
        completion_time_ms: session.completion_time_ms,
        difficulty: session.difficulty,
        timestamp: session.timestamp,
        telemetryDetails: {
          hesitationCount: session.hesitation_count,
          responseTimeVariance: session.response_time_variance,
        },
      }).catch(err => console.warn('PersonalMemoryDB recordSession notice:', err));

      PersonalMemoryDB.saveBaseline(baseline).catch(err =>
        console.warn('PersonalMemoryDB saveBaseline notice:', err)
      );
    } catch (e) {
      console.warn('Could not store personal session history:', e);
    }
  }

  /**
   * Computes the personal median of an array of numbers.
   */
  public static calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Computes Median Absolute Deviation (MAD) for robust outlier-resistant statistics.
   * Multiplied by 1.4826 to estimate standard deviation under normal distribution assumptions.
   */
  public static calculateMAD(values: number[], median: number): number {
    if (values.length <= 1) return 0.05;
    const absDeviations = values.map(v => Math.abs(v - median));
    const mad = this.calculateMedian(absDeviations);
    return Math.max(0.01, Math.round(mad * 1.4826 * 100) / 100);
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
   * Multi-signal requirement: Meaningful deviation requires accuracy degradation AND
   * (latency increase OR elevated correction frequency OR multiple hesitations).
   * Never flags a deviation from a single bad score or isolated pause.
   */
  public static evaluateAgainstBaseline(
    userId: number,
    currentSession: SessionEvidenceVector,
    domain: string = 'overall'
  ): PersonalBaselineMetrics {
    const history = this.getSessionHistory(userId, domain);
    const count = history.length;

    // State 1: Baseline Calibration in Progress (< MIN_CALIBRATION_SESSIONS)
    if (count < BASELINE_THRESHOLDS.MIN_CALIBRATION_SESSIONS) {
      return {
        userId,
        domain,
        eligibleSessionCount: count,
        baselineMedianAccuracy: currentSession.accuracy,
        baselineMedianLatencyMs: currentSession.mean_response_time_ms ?? 0,
        baselineMedianCorrections: currentSession.corrections,
        baselineMedianCompletionTimeMs: currentSession.completion_time_ms ?? 0,
        baselineStdDev: 0.05,
        baselineRobustStdDev: 0.05,
        status: 'CALIBRATING',
        statusLabel: 'Baseline Calibration in Progress',
        trendDescription: `Learning your personal rhythm... (${count} of ${BASELINE_THRESHOLDS.MIN_CALIBRATION_SESSIONS} calibration sessions recorded).`,
        reasonCodes: ['baseline_calibrating'],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Calculate baseline medians from history (prior sessions)
    const accuracies = history.map(s => s.accuracy);
    const latencies = history.map(s => s.mean_response_time_ms).filter((l): l is number => typeof l === 'number' && l !== null);
    const correctionsList = history.map(s => s.corrections);
    const completionTimes = history.map(s => s.completion_time_ms).filter((c): c is number => typeof c === 'number' && c !== null);
    const holdTimes = history.map(s => s.mean_hold_duration_ms).filter((h): h is number => typeof h === 'number' && h !== null);
    const hesitations = history.map(s => s.hesitation_count).filter((h): h is number => typeof h === 'number');

    const medianAcc = this.calculateMedian(accuracies);
    const medianLat = latencies.length > 0 ? this.calculateMedian(latencies) : (currentSession.mean_response_time_ms ?? 0);
    const medianCorr = this.calculateMedian(correctionsList);
    const medianComp = completionTimes.length > 0 ? this.calculateMedian(completionTimes) : (currentSession.completion_time_ms ?? 0);
    const medianHold = holdTimes.length > 0 ? this.calculateMedian(holdTimes) : undefined;
    const medianHes = hesitations.length > 0 ? this.calculateMedian(hesitations) : undefined;

    const stdDevAcc = this.calculateStdDev(accuracies, medianAcc);
    const robustStdDevAcc = this.calculateMAD(accuracies, medianAcc);

    // Multi-signal deviation calculation
    const accDelta = currentSession.accuracy - medianAcc;
    const latencyPctChange = currentSession.mean_response_time_ms !== null && medianLat > 0
      ? (currentSession.mean_response_time_ms - medianLat) / medianLat
      : 0;
    const corrDelta = currentSession.corrections - medianCorr;
    const hesCount = currentSession.hesitation_count || 0;

    const reasons: string[] = [];

    // Meaningful Deviation: Multi-signal degradation beyond personal variance
    // Condition: Accuracy drop >= 15% AND (latency increased >= 35% OR corrections elevated OR hesitations >= 3)
    const isMeaningful = (
      accDelta <= BASELINE_THRESHOLDS.MEANINGFUL_ACCURACY_DROP &&
      (latencyPctChange >= BASELINE_THRESHOLDS.MEANINGFUL_LATENCY_INCREASE_PCT || 
       corrDelta >= BASELINE_THRESHOLDS.MEANINGFUL_CORRECTIONS_DELTA || 
       currentSession.corrections >= BASELINE_THRESHOLDS.MEANINGFUL_CORRECTIONS_ABSOLUTE ||
       hesCount >= BASELINE_THRESHOLDS.MEANINGFUL_HESITATION_THRESHOLD)
    );

    // Minor Deviation: Slower response or mild drop within tolerance
    const isMinor = (
      (accDelta <= BASELINE_THRESHOLDS.MINOR_ACCURACY_DROP && accDelta > BASELINE_THRESHOLDS.MEANINGFUL_ACCURACY_DROP) ||
      (latencyPctChange >= BASELINE_THRESHOLDS.MINOR_LATENCY_INCREASE_PCT && latencyPctChange < BASELINE_THRESHOLDS.MEANINGFUL_LATENCY_INCREASE_PCT) ||
      (hesCount >= 2 && !isMeaningful)
    );

    let status: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION' = 'NORMAL';
    let statusLabel = 'Aligned with Personal Pattern';
    let description = 'Performance is stable and aligned with your usual personal pattern.';

    if (isMeaningful) {
      status = 'MEANINGFUL_DEVIATION';
      statusLabel = 'Meaningful Deviation';
      description = 'Recent interaction is outside the established personal baseline.';
      if (accDelta <= BASELINE_THRESHOLDS.MEANINGFUL_ACCURACY_DROP) reasons.push('lower_task_accuracy');
      if (latencyPctChange >= BASELINE_THRESHOLDS.MEANINGFUL_LATENCY_INCREASE_PCT) reasons.push('slower_response_latency');
      if (corrDelta >= BASELINE_THRESHOLDS.MEANINGFUL_CORRECTIONS_DELTA || currentSession.corrections >= BASELINE_THRESHOLDS.MEANINGFUL_CORRECTIONS_ABSOLUTE) {
        reasons.push('increased_corrections');
      }
      if (hesCount >= BASELINE_THRESHOLDS.MEANINGFUL_HESITATION_THRESHOLD) {
        reasons.push('hesitation_pauses_detected');
      }
    } else if (isMinor) {
      status = 'MINOR_DEVIATION';
      statusLabel = 'Minor Deviation Observed';
      description = 'Slight variation observed compared to recent sessions; continuing regular rhythm.';
      if (latencyPctChange >= BASELINE_THRESHOLDS.MINOR_LATENCY_INCREASE_PCT) reasons.push('mild_latency_variance');
      if (accDelta <= BASELINE_THRESHOLDS.MINOR_ACCURACY_DROP) reasons.push('mild_accuracy_dip');
      if (reasons.length === 0) reasons.push('mild_variance_observed');
    } else {
      status = 'NORMAL';
      statusLabel = 'Normal Interaction';
      description = 'Your rhythm, accuracy, and cadence match your established baseline.';
      reasons.push('performance_stable');
    }

    // Check contact hold motor consistency if present
    if (currentSession.mean_hold_duration_ms && medianHold && Math.abs(currentSession.mean_hold_duration_ms - medianHold) > 150) {
      reasons.push('motor_cadence_variance');
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
      baselineRobustStdDev: robustStdDevAcc,
      baselineMedianHoldDurationMs: medianHold ? Math.round(medianHold) : undefined,
      baselineMedianHesitations: medianHes !== undefined ? Math.round(medianHes) : undefined,
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
    const existingRajesh = localStorage.getItem(`${HISTORY_KEY_PREFIX}${rajeshId}_overall`);
    const existingSunita = localStorage.getItem(`${HISTORY_KEY_PREFIX}${sunitaId}_overall`);

    // Only seed Rajesh if no history exists
    if (!existingRajesh) {
      const rajeshHistory: SessionEvidenceVector[] = [
        { accuracy: 0.88, mean_response_time_ms: 2100, corrections: 1, repeat_errors: 0, completion_time_ms: 28000, difficulty: 3, hesitation_count: 0, mean_hold_duration_ms: 175, timestamp: '2026-09-08T10:00:00Z' },
        { accuracy: 0.90, mean_response_time_ms: 1950, corrections: 0, repeat_errors: 0, completion_time_ms: 26000, difficulty: 3, hesitation_count: 0, mean_hold_duration_ms: 180, timestamp: '2026-09-09T10:00:00Z' },
        { accuracy: 0.85, mean_response_time_ms: 2200, corrections: 1, repeat_errors: 1, completion_time_ms: 30000, difficulty: 3, hesitation_count: 1, mean_hold_duration_ms: 190, timestamp: '2026-09-10T10:00:00Z' },
        { accuracy: 0.92, mean_response_time_ms: 1850, corrections: 0, repeat_errors: 0, completion_time_ms: 25000, difficulty: 4, hesitation_count: 0, mean_hold_duration_ms: 170, timestamp: '2026-09-11T10:00:00Z' },
        { accuracy: 0.87, mean_response_time_ms: 2050, corrections: 1, repeat_errors: 0, completion_time_ms: 29000, difficulty: 4, hesitation_count: 0, mean_hold_duration_ms: 185, timestamp: '2026-09-12T10:00:00Z' },
        { accuracy: 0.89, mean_response_time_ms: 2000, corrections: 1, repeat_errors: 0, completion_time_ms: 27000, difficulty: 4, hesitation_count: 0, mean_hold_duration_ms: 175, timestamp: '2026-09-13T10:00:00Z' },
      ];
      localStorage.setItem(`${HISTORY_KEY_PREFIX}${rajeshId}_overall`, JSON.stringify(rajeshHistory));
      rajeshHistory.forEach(s => {
        PersonalMemoryDB.recordSession({
          userId: rajeshId,
          domain: 'overall',
          ...s,
        }).catch(() => {});
      });
    }

    // Only seed Sunita if no history exists
    if (!existingSunita) {
      const sunitaHistory: SessionEvidenceVector[] = [
        { accuracy: 0.85, mean_response_time_ms: 2150, corrections: 2, repeat_errors: 1, completion_time_ms: 32000, difficulty: 3, hesitation_count: 1, mean_hold_duration_ms: 210, timestamp: '2026-09-08T11:00:00Z' },
        { accuracy: 0.86, mean_response_time_ms: 2050, corrections: 1, repeat_errors: 0, completion_time_ms: 31000, difficulty: 3, hesitation_count: 0, mean_hold_duration_ms: 205, timestamp: '2026-09-09T11:00:00Z' },
        { accuracy: 0.83, mean_response_time_ms: 2200, corrections: 2, repeat_errors: 1, completion_time_ms: 33000, difficulty: 3, hesitation_count: 1, mean_hold_duration_ms: 220, timestamp: '2026-09-10T11:00:00Z' },
        { accuracy: 0.84, mean_response_time_ms: 2100, corrections: 2, repeat_errors: 0, completion_time_ms: 32000, difficulty: 3, hesitation_count: 0, mean_hold_duration_ms: 215, timestamp: '2026-09-11T11:00:00Z' },
        { accuracy: 0.82, mean_response_time_ms: 2300, corrections: 2, repeat_errors: 1, completion_time_ms: 34000, difficulty: 3, hesitation_count: 1, mean_hold_duration_ms: 225, timestamp: '2026-09-12T11:00:00Z' },
      ];
      localStorage.setItem(`${HISTORY_KEY_PREFIX}${sunitaId}_overall`, JSON.stringify(sunitaHistory));
      sunitaHistory.forEach(s => {
        PersonalMemoryDB.recordSession({
          userId: sunitaId,
          domain: 'overall',
          ...s,
        }).catch(() => {});
      });
    }
  }
}
