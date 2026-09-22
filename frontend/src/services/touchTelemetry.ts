/**
 * MindMitra - Touch Behavioral Sensor Engine
 * Measures interaction telemetry directly from phone touch events:
 * Latency before first action, inter-tap cadence, hesitation intervals,
 * error & correction rates, and motor interaction consistency.
 *
 * NOTE: Strictly behavioral observation telemetry. Not a clinical diagnostic tool.
 */

export interface TouchBehavioralVector {
  first_interaction_latency_ms: number | null;
  mean_inter_tap_latency_ms: number | null;
  response_time_variance: number | null;
  hesitation_count: number;
  micro_hesitation_count?: number; // Pauses between 1500ms - 3000ms
  macro_hesitation_count?: number; // Pauses >= 3000ms
  mean_hold_duration_ms?: number | null; // Down-to-up contact duration
  hold_duration_variance?: number | null; // Motor interaction rhythm stability
  repeat_error_rate: number;
  correction_rate: number;
  completion_time_ms: number | null;
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
  private holdDurations: number[] = [];
  private pendingTouches: Map<string | number, number> = new Map();
  private hesitationCount: number = 0;
  private microHesitationCount: number = 0;
  private macroHesitationCount: number = 0;
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
    this.holdDurations = [];
    this.pendingTouches.clear();
    this.hesitationCount = 0;
    this.microHesitationCount = 0;
    this.macroHesitationCount = 0;
    this.repeatErrorCount = 0;
    this.correctionCount = 0;
    this.totalErrors = 0;
    this.totalSuccesses = 0;
    this.totalTaps = 0;
  }

  /**
   * Tracks touch down timestamp to measure hold duration.
   */
  public recordTouchDown(touchId: string | number = 'default'): void {
    this.pendingTouches.set(touchId, performance.now());
  }

  /**
   * Tracks touch up and records hold duration.
   */
  public recordTouchUp(
    touchId: string | number = 'default',
    event: {
      isSuccess?: boolean;
      isError?: boolean;
      isRepeatError?: boolean;
      isCorrection?: boolean;
    } = {}
  ): void {
    const now = performance.now();
    const downTime = this.pendingTouches.get(touchId);
    if (downTime) {
      const holdDuration = Math.round(now - downTime);
      this.holdDurations.push(Math.min(10000, Math.max(20, holdDuration)));
      this.pendingTouches.delete(touchId);
    }
    this.recordInteraction(event);
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
        // Pauses >= 3000ms: Macro hesitation / search delay
        this.hesitationCount++;
        this.macroHesitationCount++;
      } else if (interval >= 1500) {
        // Pauses 1500ms - 2999ms: Micro hesitation / cautious deliberation
        this.microHesitationCount++;
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
      : null;

    const intervals = this.interTapIntervals;
    const meanInterTapLatencyMs = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : null;

    // Sample variance in seconds^2 for ML consistency; null if < 2 intervals
    let variance: number | null = null;
    if (intervals.length >= 2) {
      const intervalsSec = intervals.map(x => x / 1000);
      const meanSec = intervalsSec.reduce((a, b) => a + b, 0) / intervalsSec.length;
      const squaredDiffs = intervalsSec.map(x => Math.pow(x - meanSec, 2));
      const s2 = squaredDiffs.reduce((a, b) => a + b, 0) / (intervalsSec.length - 1);
      variance = Math.round(s2 * 10000) / 10000;
    }

    // Hold duration metrics (contact motor consistency)
    const holds = this.holdDurations;
    const meanHoldDurationMs = holds.length > 0
      ? Math.round(holds.reduce((a, b) => a + b, 0) / holds.length)
      : null;

    let holdVariance: number | null = null;
    if (holds.length >= 2) {
      const meanHold = holds.reduce((a, b) => a + b, 0) / holds.length;
      const squaredHoldDiffs = holds.map(x => Math.pow(x - meanHold, 2));
      const s2Hold = squaredHoldDiffs.reduce((a, b) => a + b, 0) / (holds.length - 1);
      holdVariance = Math.round(s2Hold * 10) / 10;
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
      micro_hesitation_count: this.microHesitationCount,
      macro_hesitation_count: this.macroHesitationCount,
      mean_hold_duration_ms: meanHoldDurationMs,
      hold_duration_variance: holdVariance,
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
