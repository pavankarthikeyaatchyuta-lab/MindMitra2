import { Language } from '../types';
import { InstructionService, ActivityId, ActivityContext } from './instructionService';

export interface VoiceProvider {
  language: Language;
  locale: string;
  isAvailable(): boolean;
  speak(text: string, rate?: number): Promise<{ success: boolean; error?: string }>;
  stop(): void;
}

export interface VoiceState {
  isSpeaking: boolean;
  currentText: string;
  currentLanguage: Language;
  isVoiceAvailable: boolean;
  lastSpokenAt: number;
}

class BaseBrowserVoiceProvider implements VoiceProvider {
  public language: Language;
  public locale: string;
  private fallbackLocales: string[];

  constructor(lang: Language, locale: string, fallbacks: string[] = []) {
    this.language = lang;
    this.locale = locale;
    this.fallbackLocales = fallbacks;
  }

  public isAvailable(): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return true; // Voices might not be loaded yet; give benefit of doubt
    return this.findMatchingVoice(voices) !== null;
  }

  protected findMatchingVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const target = this.locale.toLowerCase().replace('_', '-');
    const langPrefix = this.language.toLowerCase();

    // 1. Exact locale match (e.g. te-IN)
    let match = voices.find(v => v.lang.toLowerCase().replace('_', '-') === target);
    if (match) return match;

    // 2. Fallbacks
    for (const fb of this.fallbackLocales) {
      const fbClean = fb.toLowerCase().replace('_', '-');
      match = voices.find(v => v.lang.toLowerCase().replace('_', '-') === fbClean);
      if (match) return match;
    }

    // 3. Prefix match
    match = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
    if (match) return match;

    // 4. English fallback ONLY if English provider
    if (this.language === 'en') {
      return voices[0] || null;
    }

    // Never use an English voice to speak Telugu or Hindi
    return null;
  }

  public speak(text: string, rate: number = 0.85): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        return resolve({ success: false, error: 'speechSynthesis not supported' });
      }

      window.speechSynthesis.cancel();

      const voices = window.speechSynthesis.getVoices();
      const voice = this.findMatchingVoice(voices);

      // Guard: do not read non-English text with an English-only voice
      if (this.language !== 'en' && !voice && voices.length > 0) {
        return resolve({ 
          success: false, 
          error: `No native ${this.language === 'te' ? 'Telugu' : 'Hindi'} voice found on this device` 
        });
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.locale;
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = rate; // Elder-friendly gentle pace
      utterance.pitch = 1.0;

      utterance.onend = () => {
        resolve({ success: true });
      };

      utterance.onerror = (err) => {
        resolve({ success: false, error: err.error || 'TTS error' });
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

class EnglishVoiceProvider extends BaseBrowserVoiceProvider {
  constructor() {
    super('en', 'en-IN', ['en-IN', 'en-GB', 'en-US', 'en']);
  }
}

class TeluguVoiceProvider extends BaseBrowserVoiceProvider {
  constructor() {
    super('te', 'te-IN', ['te-IN', 'te_IN', 'te']);
  }
}

class HindiVoiceProvider extends BaseBrowserVoiceProvider {
  constructor() {
    super('hi', 'hi-IN', ['hi-IN', 'hi_IN', 'hi']);
  }
}

export class VoiceService {
  private static providers: Record<Language, VoiceProvider> = {
    en: new EnglishVoiceProvider(),
    te: new TeluguVoiceProvider(),
    hi: new HindiVoiceProvider(),
  };

  private static state: VoiceState = {
    isSpeaking: false,
    currentText: '',
    currentLanguage: 'en',
    isVoiceAvailable: true,
    lastSpokenAt: 0,
  };

  private static listeners: Set<(state: VoiceState) => void> = new Set();
  private static cooldownMs: number = 3000; // 3.0-second cooldown for non-priority cues

  public static getState(): VoiceState {
    return { ...this.state };
  }

  public static subscribe(cb: (state: VoiceState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private static updateState(patch: Partial<VoiceState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(cb => {
      try { cb(this.getState()); } catch {}
    });
  }

  /**
   * Speaks localized instruction for a specific game and context.
   */
  public static async speakContext(
    activityId: ActivityId,
    context: ActivityContext,
    language: Language = 'en',
    isPriority: boolean = false
  ): Promise<{ success: boolean; text: string; error?: string }> {
    const text = InstructionService.get(activityId, context, language);
    if (!text) return { success: false, text: '', error: 'Instruction text empty' };
    const res = await this.speak(text, language, isPriority);
    return { ...res, text };
  }

  /**
   * Core Speak method routed through language providers with cooldown and synchronized state.
   */
  public static async speak(
    text: string,
    language: Language = 'en',
    isPriority: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    if (!text || !text.trim()) return { success: false, error: 'Empty text' };

    const now = Date.now();
    // Enforce cooldown for automatic ambient cues unless user explicitly triggered (isPriority)
    if (!isPriority && now - this.state.lastSpokenAt < this.cooldownMs) {
      return { success: false, error: 'Cooldown active' };
    }

    const provider = this.providers[language] || this.providers.en;
    const isAvailable = provider.isAvailable();

    this.updateState({
      isSpeaking: true,
      currentText: text,
      currentLanguage: language,
      isVoiceAvailable: isAvailable,
      lastSpokenAt: now,
    });

    try {
      const result = await provider.speak(text, 0.85);
      this.updateState({
        isSpeaking: false,
        isVoiceAvailable: result.success ? true : isAvailable,
      });
      return result;
    } catch (err: any) {
      this.updateState({
        isSpeaking: false,
        isVoiceAvailable: false,
      });
      return { success: false, error: err?.message || 'Voice synthesis failure' };
    }
  }

  /**
   * Immediately stops any ongoing speech across all providers.
   */
  public static stop(): void {
    Object.values(this.providers).forEach(p => p.stop());
    this.updateState({
      isSpeaking: false,
      currentText: '',
    });
  }
}
