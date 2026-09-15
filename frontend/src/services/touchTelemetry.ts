/**
 * MindMitra - Touch Behavioral Sensor Engine
 * Measures interaction telemetry directly from phone touch events:
 * Latency before first action, inter-tap cadence, hesitation intervals,
 * error & correction rates, and motor interaction consistency.
 *
 * NOTE: Strictly behavioral observation telemetry. Not a clinical diagnostic tool.
 */

export interface TouchBehavioralVector {
  first_interaction_latency_ms: number;
  mean_inter_tap_latency_ms: number;
  response_time_variance: number;
  hesitation_count: number;
  repeat_error_rate: number;
  correction_rate: number;
  completion_time_ms: number;
  accuracy: number;
  total_taps: number;
  current_difficulty: number;
  timestamp: string;
}

export class TouchSensorTracker {
  private startTime: number = 0;
  private firstTapTime: number = 0;
  private lastTapTime: number = 0;
  private interTapIntervals: number[] = [];
  private hesitationCount: number = 0;
  private repeatErrorCount: number = 0;
  private correctionCount: number = 0;
  private totalErrors: number = 0;
  private totalSuccesses: number = 0;
  private totalTaps: number = 0;
  private currentDifficulty: number = 2;

  constructor(initialDifficulty: number = 2) {
    this.currentDifficulty = initialDifficulty;
    this.reset();
  }

  public reset(difficulty?: number): void {
    if (difficulty !== undefined) {
      this.currentDifficulty = difficulty;
    }
    this.startTime = performance.now();
    this.firstTapTime = 0;
    this.lastTapTime = 0;
    this.interTapIntervals = [];
    this.hesitationCount = 0;
    this.repeatErrorCount = 0;
    this.correctionCount = 0;
    this.totalErrors = 0;
    this.totalSuccesses = 0;
    this.totalTaps = 0;
  }

  /**
   * Records a user tap/touch interaction with behavioral categorization.
   */
  public recordInteraction(event: {
    isSuccess?: boolean;
    isError?: boolean;
    isRepeatError?: boolean;
    isCorrection?: boolean;
  }): void {
    const now = performance.now();
    this.totalTaps++;

    // Measure time before first interaction
    if (this.firstTapTime === 0) {
      this.firstTapTime = now;
    }

    // Measure inter-tap interval and hesitation
    if (this.lastTapTime > 0) {
      const interval = Math.round(now - this.lastTapTime);
      this.interTapIntervals.push(interval);
      if (interval >= 3000) {
        // Pauses > 3 seconds signify cognitive hesitation or search delay
        this.hesitationCount++;
      }
    }
    this.lastTapTime = now;

    if (event.isSuccess) this.totalSuccesses++;
    if (event.isError) this.totalErrors++;
    if (event.isRepeatError) this.repeatErrorCount++;
    if (event.isCorrection) this.correctionCount++;
  }

  /**
   * Finalizes the activity session and extracts the behavioral feature vector.
   */
  public finalize(overrideAccuracy?: number): TouchBehavioralVector {
    const now = performance.now();
    const completionTimeMs = Math.round(now - this.startTime);

    const firstInteractionLatencyMs = this.firstTapTime > 0
      ? Math.round(this.firstTapTime - this.startTime)
      : Math.min(completionTimeMs, 2000);

    const intervals = this.interTapIntervals;
    const meanInterTapLatencyMs = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : firstInteractionLatencyMs || 2200;

    // Variance calculation (normalized to 0.0 - 1.0)
    let variance = 0.15;
    if (intervals.length > 1) {
      const mean = meanInterTapLatencyMs;
      const squaredDiffs = intervals.map(x => Math.pow(x - mean, 2));
      const rawVariance = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
      // Normalized standard deviation
      variance = Math.min(1.0, Math.round((Math.sqrt(rawVariance) / Math.max(mean, 1000)) * 100) / 100);
    }

    const accuracy = overrideAccuracy !== undefined
      ? overrideAccuracy
      : this.totalSuccesses / Math.max(1, this.totalSuccesses + this.totalErrors);

    const repeatErrorRate = Math.min(1.0, this.repeatErrorCount / Math.max(1, this.totalTaps));
    const correctionRate = Math.min(1.0, this.correctionCount / Math.max(1, this.totalTaps));

    return {
      first_interaction_latency_ms: firstInteractionLatencyMs,
      mean_inter_tap_latency_ms: meanInterTapLatencyMs,
      response_time_variance: variance,
      hesitation_count: this.hesitationCount,
      repeat_error_rate: Math.round(repeatErrorRate * 100) / 100,
      correction_rate: Math.round(correctionRate * 100) / 100,
      completion_time_ms: completionTimeMs,
      accuracy: Math.round(Math.min(1.0, Math.max(0.05, accuracy)) * 100) / 100,
      total_taps: this.totalTaps,
      current_difficulty: this.currentDifficulty,
      timestamp: new Date().toISOString(),
    };
  }
}
