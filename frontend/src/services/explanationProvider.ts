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
  language?: 'en' | 'te' | 'hi';
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
    const lang = req.language || 'en';
    const isDev = req.baseline.status === 'MEANINGFUL_DEVIATION' || req.adaptation.decision === 'DECREASE';
    const isIncrease = req.adaptation.decision === 'INCREASE';

    const latDeltaPct = Math.round(((req.session.latencyMs - req.baseline.medianLatencyMs) / Math.max(1, req.baseline.medianLatencyMs)) * 100);
    const accDeltaPct = Math.round((req.session.accuracy - req.baseline.medianAccuracy) * 100);

    let summary = '';
    let caregiverNote = '';

    if (lang === 'te') {
      if (isDev) {
        summary = `ఈ రోజు మీ స్పందనా వేగం మరియు పద్ధతిలో వ్యత్యాసం గమనించబడింది.`;
        caregiverNote = `${req.profileName} వ్యాయామం సమయంలో కొద్దిగా ఎక్కువ సమయం తీసుకున్నారు. సౌలభ్యం కోసం స్థాయి ${req.adaptation.previousDifficulty} నుండి ${req.adaptation.recommendedDifficulty} కి తగ్గించబడింది.`;
      } else if (isIncrease) {
        summary = `చాలా వేగవంతమైన మరియు ఖచ్చితమైన స్పందన! సాధారణ వేగం కంటే బాగుంది.`;
        caregiverNote = `${req.profileName} స్థిరమైన మరియు శ్రద్ధగల స్పర్శ వేగాన్ని చూపించారు. తదుపరి స్థాయి ${req.adaptation.recommendedDifficulty} కి పెంచబడింది.`;
      } else {
        summary = `స్పందనా విధానం మీ వ్యక్తిగత సాధారణ పరిధిలోనే స్థిరంగా ఉంది (${req.baseline.eligibleSessionCount} సెషన్లు రికార్డ్ అయ్యాయి).`;
        caregiverNote = `${req.profileName} సాధారణ స్పర్శ వేగం (~${Math.round(req.session.latencyMs)}ms) మరియు స్థిరమైన నియంత్రణతో ఉన్నారు. స్థాయి ${req.adaptation.recommendedDifficulty} వద్ద కొనసాగుతోంది.`;
      }
    } else if (lang === 'hi') {
      if (isDev) {
        summary = `आज प्रतिक्रिया गति में सामान्य से थोड़ा धीमापन देखा गया।`;
        caregiverNote = `${req.profileName} ने अभ्यास में अधिक समय लिया। सुविधा के लिए स्तर ${req.adaptation.previousDifficulty} से घटाकर ${req.adaptation.recommendedDifficulty} किया गया है।`;
      } else if (isIncrease) {
        summary = `उत्कृष्ट प्रतिक्रिया! सामान्य गति से तेज और सटीक कार्य निष्पादन।`;
        caregiverNote = `${req.profileName} ने बहुत सहज और स्थिर प्रदर्शन किया। उत्तेजना बनाए रखने के लिए अगला स्तर ${req.adaptation.recommendedDifficulty} होगा।`;
      } else {
        summary = `प्रतिक्रिया गति आपके व्यक्तिगत सामान्य स्तर के अनुकूल है (${req.baseline.eligibleSessionCount} सत्र रिकॉर्ड किए गए)।`;
        caregiverNote = `${req.profileName} की स्पर्श गति (~${Math.round(req.session.latencyMs)}ms) स्थिर है। कठिनाई स्तर ${req.adaptation.recommendedDifficulty} पर बनाए रखा गया है।`;
      }
    } else {
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
    const lang = req.language || 'en';
    const langInstr = lang === 'te'
      ? 'Respond strictly in Telugu (తెలుగు) using warm, elder-friendly wording.'
      : lang === 'hi'
      ? 'Respond strictly in Hindi (हिन्दी) using warm, elder-friendly wording.'
      : 'Respond in English using warm, elder-friendly wording.';

    const prompt = `You are MindMitra, an offline-first behavioral memory companion on an iQOO phone.
Explain the following behavioral observation to a caregiver in a warm, respectful, strictly non-diagnostic manner.
NEVER use medical words like dementia, alzheimers, disease, or diagnosis.
${langInstr}
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
