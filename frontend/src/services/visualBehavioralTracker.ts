/**
 * MindMitra - Genuine On-Device Visual Presence & Interaction Sensor Engine
 * 
 * Captures non-clinical, non-diagnostic visual interaction signals in local volatile memory:
 * - Visual presence ratio (fraction of frames where presence is observed facing device)
 * - Movement score (variance of optical centroid displacements)
 * - Orientation stability (consistency of facing screen center)
 * - Visual hesitation intervals (intervals where elder is attentive but no touch occurs)
 * 
 * STRICT PRIVACY & HONESTY GUARANTEE:
 * - All frame analysis happens locally on-device inside offscreen canvas memory.
 * - Zero raw video frames, snapshots, or crops are EVER saved to disk, indexedDB, or sent across network.
 * - Zero emotion labels ("Happy", "Sad", "Confused"), zero facial recognition claims, zero dementia diagnosis claims.
 */

export interface VisualBehavioralMetrics {
  visual_presence_ratio: number | null; // 0.0 to 1.0 (null if sensor inactive/denied)
  face_detected_ratio?: number | null;  // Backwards-compatible alias to visual_presence_ratio
  head_movement_score: number | null;   // 0.0 to 1.0 (null if sensor inactive)
  orientation_stability: number | null; // 0.0 to 1.0 (null if sensor inactive)
  visual_hesitation_ms: number | null;  // Cumulative ms attentive without touch
  total_sampled_frames: number;
  status_summary: string;
}

export class VisualBehavioralTracker {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private intervalId: any = null;
  private isRunning: boolean = false;

  private totalFrames: number = 0;
  private detectedFrames: number = 0;
  private prevCentroid: { x: number; y: number } | null = null;
  private displacements: number[] = [];
  private centerDistances: number[] = [];
  private lastTouchTime: number = Date.now();
  private cumulativeHesitationMs: number = 0;
  private lastSampleTime: number = Date.now();
  private nativeFaceDetector: any = null;

  constructor() {
    if (typeof window !== 'undefined' && (window as any).FaceDetector) {
      try {
        this.nativeFaceDetector = new (window as any).FaceDetector({
          maxDetectedFaces: 1,
          fastMode: true,
        });
      } catch {
        this.nativeFaceDetector = null;
      }
    }
  }

  public start(videoElement: HTMLVideoElement): boolean {
    if (!videoElement || typeof document === 'undefined') return false;

    this.stop();

    this.videoElement = videoElement;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 80;
    this.canvas.height = 80;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    if (!this.ctx) return false;

    this.totalFrames = 0;
    this.detectedFrames = 0;
    this.prevCentroid = null;
    this.displacements = [];
    this.centerDistances = [];
    this.lastTouchTime = Date.now();
    this.cumulativeHesitationMs = 0;
    this.lastSampleTime = Date.now();
    this.isRunning = true;

    // Sample optical frame at ~300ms cadence (lightweight, elder mobile battery friendly)
    this.intervalId = setInterval(() => {
      this.sampleFrame();
    }, 300);

    return true;
  }

  public recordUserInteraction(): void {
    this.lastTouchTime = Date.now();
  }

  private sampleFrame(): void {
    if (!this.isRunning || !this.videoElement || !this.ctx || !this.canvas) return;
    if (this.videoElement.readyState < 2) return; // HAVE_CURRENT_DATA

    const now = Date.now();
    const frameIntervalMs = Math.max(50, now - this.lastSampleTime);
    this.lastSampleTime = now;
    this.totalFrames++;

    const width = this.canvas.width;
    const height = this.canvas.height;

    try {
      this.ctx.drawImage(this.videoElement, 0, 0, width, height);
      const imageData = this.ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Analyze face region optical presence via skin-tone / luminance gradient centroid
      let massSum = 0;
      let xSum = 0;
      let ySum = 0;

      // Scan central 70% of frame (typical user facing camera)
      const minX = Math.floor(width * 0.15);
      const maxX = Math.floor(width * 0.85);
      const minY = Math.floor(height * 0.15);
      const maxY = Math.floor(height * 0.85);

      for (let y = minY; y < maxY; y += 2) {
        for (let x = minX; x < maxX; x += 2) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Generalized skin-tone / facial luminance heuristic in volatile memory
          // R > 45, G > 35, B > 20, R > G, R > B, max-min > 15
          if (r > 45 && g > 35 && b > 20 && r > g && r > b && (r - Math.min(g, b)) > 12) {
            massSum++;
            xSum += x;
            ySum += y;
          }
        }
      }

      const minExpectedMass = 25; // Minimum detected pixel cluster
      const faceDetected = massSum >= minExpectedMass;

      if (faceDetected) {
        this.detectedFrames++;
        const cx = xSum / massSum;
        const cy = ySum / massSum;

        // Centroid displacement (head movement magnitude)
        if (this.prevCentroid) {
          const dx = cx - this.prevCentroid.x;
          const dy = cy - this.prevCentroid.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          this.displacements.push(dist);
        }
        this.prevCentroid = { x: cx, y: cy };

        // Distance from screen center (orientation stability)
        const centerDist = Math.sqrt(
          Math.pow((cx - width / 2) / (width / 2), 2) +
          Math.pow((cy - height / 2) / (height / 2), 2)
        );
        this.centerDistances.push(Math.min(1.0, centerDist));

        // Visual hesitation: face present & attentive, but no touch for > 2000ms
        const idleDuration = now - this.lastTouchTime;
        if (idleDuration > 2000) {
          this.cumulativeHesitationMs += frameIntervalMs;
        }
      } else {
        this.prevCentroid = null;
      }
    } catch {
      // Gracefully handle browser canvas draw edge cases
    }
  }

  public getCurrentMetrics(): VisualBehavioralMetrics {
    if (this.totalFrames === 0) {
      return {
        visual_presence_ratio: null,
        face_detected_ratio: null,
        head_movement_score: null,
        orientation_stability: null,
        visual_hesitation_ms: null,
        total_sampled_frames: 0,
        status_summary: 'Visual sensor not active',
      };
    }

    const presenceRatio = Math.round((this.detectedFrames / this.totalFrames) * 100) / 100;

    // Movement score: mean centroid displacement normalized (0.0 to 1.0)
    let movementScore: number | null = null;
    if (this.displacements.length > 0) {
      const avgDisp = this.displacements.reduce((a, b) => a + b, 0) / this.displacements.length;
      // Normal face jitter is 0.5 - 3 pixels at 80x80; large motion is > 8 pixels
      movementScore = Math.min(1.0, Math.round((avgDisp / 10) * 100) / 100);
    }

    // Orientation stability: 1.0 - mean distance from center (0.0 to 1.0)
    let orientationStability: number | null = null;
    if (this.centerDistances.length > 0) {
      const avgCenterDist = this.centerDistances.reduce((a, b) => a + b, 0) / this.centerDistances.length;
      orientationStability = Math.max(0.0, Math.min(1.0, Math.round((1.0 - avgCenterDist) * 100) / 100));
    }

    const summaryParts: string[] = [];
    if (presenceRatio >= 0.7) {
      summaryParts.push(`Visual presence observed (${Math.round(presenceRatio * 100)}% frames)`);
    } else if (presenceRatio >= 0.3) {
      summaryParts.push(`Visual presence intermittently observed (${Math.round(presenceRatio * 100)}%)`);
    } else {
      summaryParts.push('Limited visual presence observed');
    }

    if (orientationStability !== null) {
      summaryParts.push(orientationStability >= 0.65 ? 'Orientation stable' : 'Orientation varied');
    }

    if (this.cumulativeHesitationMs > 4000) {
      summaryParts.push('Extended visual hesitation noted');
    }

    return {
      visual_presence_ratio: presenceRatio,
      face_detected_ratio: presenceRatio,
      head_movement_score: movementScore,
      orientation_stability: orientationStability,
      visual_hesitation_ms: Math.round(this.cumulativeHesitationMs),
      total_sampled_frames: this.totalFrames,
      status_summary: summaryParts.join(' • '),
    };
  }

  public stop(): VisualBehavioralMetrics {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const metrics = this.getCurrentMetrics();
    this.isRunning = false;
    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;

    return metrics;
  }
}
