/**
 * MindMitra - Behavioral Explanation Provider
 * Abstraction layer providing natural-language behavioral explanations.
 * 
 * Supports:
 * 1. LocalTemplateExplanationProvider: Instant, deterministic, 100% offline edge execution.
 * 2. OllamaExplanationProvider: Local Gemma 3 4B via Ollama (http://localhost:11434) when connected.
 *
 * NOTE: Asynchronous and non-blocking. Never stalls UI navigation or game rendering.
 * Strictly non-diagnostic: Explains phone interaction patterns, pacing, and comfort adaptations.
 */

export interface BehavioralExplanationRequest {
  profileName: string;
  baseline: {
    medianAccuracy: number;
    medianLatencyMs: number;
    medianCorrections: number;
    eligibleSessionCount: number;
    status: string;
  };
  session: {
    accuracy: number;
    latencyMs: number;
    corrections: number;
    hesitationCount?: number;
    activityType: string;
  };
  adaptation: {
    previousDifficulty: number;
    recommendedDifficulty: number;
    decision: 'DECREASE' | 'MAINTAIN' | 'INCREASE';
    reason: string;
  };
}

export interface BehavioralExplanationResult {
  summary: string;
  caregiverNote: string;
  provider: 'local_template' | 'ollama_gemma3_4b';
  latencyMs: number;
}

export class LocalTemplateExplanationProvider {
  public static generate(req: BehavioralExplanationRequest): BehavioralExplanationResult {
    const start = performance.now();
    const isDev = req.baseline.status === 'MEANINGFUL_DEVIATION' || req.adaptation.decision === 'DECREASE';
    const isIncrease = req.adaptation.decision === 'INCREASE';

    const latDeltaPct = Math.round(((req.session.latencyMs - req.baseline.medianLatencyMs) / Math.max(1, req.baseline.medianLatencyMs)) * 100);
    const accDeltaPct = Math.round((req.session.accuracy - req.baseline.medianAccuracy) * 100);

    let summary = '';
    let caregiverNote = '';

    if (isDev) {
      const latText = latDeltaPct > 15 ? `with response pacing ${latDeltaPct}% slower than normal` : 'with deliberate pacing';
      const accText = accDeltaPct < -10 ? `and ${Math.abs(accDeltaPct)}% lower accuracy than personal baseline` : '';
      summary = `Interaction rhythm showed temporary hesitation today ${latText} ${accText}.`.trim();
      caregiverNote = `${req.profileName} experienced increased cognitive load or fatigue during ${req.session.activityType}. Difficulty automatically adjusted from Level ${req.adaptation.previousDifficulty} to Level ${req.adaptation.recommendedDifficulty} to ensure comforting, non-stressful engagement.`;
    } else if (isIncrease) {
      summary = `Excellent responsiveness! Interaction rhythm was ${Math.abs(latDeltaPct)}% faster than personal baseline with high accuracy.`;
      caregiverNote = `${req.profileName} engaged fluidly with ${Math.round(req.session.accuracy * 100)}% task precision. Next session will gently advance to Level ${req.adaptation.recommendedDifficulty} to maintain healthy mental stimulation.`;
    } else {
      summary = `Stable interaction rhythm matching established personal baseline (${req.baseline.eligibleSessionCount} sessions calibrated).`;
      caregiverNote = `${req.profileName} is performing consistently with normal tap cadence (~${Math.round(req.session.latencyMs)}ms) and steady motor control. Maintained at Level ${req.adaptation.recommendedDifficulty}.`;
    }

    const elapsed = Math.round(performance.now() - start);
    return {
      summary,
      caregiverNote,
      provider: 'local_template',
      latencyMs: elapsed,
    };
  }
}

export class OllamaExplanationProvider {
  private static endpoint: string = 'http://localhost:11434/api/generate';
  private static model: string = 'gemma3:4b';

  /**
   * Sets custom Ollama endpoint or model name (e.g. for demo).
   */
  public static configure(endpoint?: string, model?: string): void {
    if (endpoint) this.endpoint = endpoint;
    if (model) this.model = model;
  }

  /**
   * Attempts to query local Ollama Gemma 3 4B.
   * If unreachable or timed out (within 2.5s), falls back gracefully to LocalTemplateExplanationProvider.
   */
  public static async generate(req: BehavioralExplanationRequest): Promise<BehavioralExplanationResult> {
    const start = performance.now();
    const prompt = `You are MindMitra, an offline-first behavioral memory companion on an iQOO phone.
Explain the following behavioral observation to a caregiver in a warm, respectful, strictly non-diagnostic manner.
NEVER use medical words like dementia, alzheimers, disease, or diagnosis.
Profile: ${req.profileName}
Activity: ${req.session.activityType}
Session Accuracy: ${Math.round(req.session.accuracy * 100)}% (Baseline: ${Math.round(req.baseline.medianAccuracy * 100)}%)
Session Latency: ${Math.round(req.session.latencyMs)}ms (Baseline: ${Math.round(req.baseline.medianLatencyMs)}ms)
Corrections: ${req.session.corrections} (Baseline: ${req.baseline.medianCorrections})
Adaptation: ${req.adaptation.decision} from Level ${req.adaptation.previousDifficulty} to Level ${req.adaptation.recommendedDifficulty}
Reason: ${req.adaptation.reason}

Return 2 sentences:
1. Summary of observed touch/pacing rhythm vs baseline.
2. Why the phone adapted difficulty for comfort or stimulation.`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.response?.trim() || '';
        if (text) {
          const elapsed = Math.round(performance.now() - start);
          return {
            summary: text.split('\n')[0] || text,
            caregiverNote: text,
            provider: 'ollama_gemma3_4b',
            latencyMs: elapsed,
          };
        }
      }
    } catch {
      // Ollama not running or timed out — fallback immediately to local template
    }

    return LocalTemplateExplanationProvider.generate(req);
  }
}
