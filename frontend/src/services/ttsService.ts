import { Language } from '../types';

export interface LanguageConfig {
  code: Language;
  locale: string;
  name: string;
  nativeName: string;
  testPhrase: string;
  fallbackLocales: string[];
}

export const LANGUAGE_CONFIGS: Record<Language, LanguageConfig> = {
  en: {
    code: 'en',
    locale: 'en-IN',
    name: 'English',
    nativeName: 'English',
    testPhrase: 'This is an English voice test for MindMitra.',
    fallbackLocales: ['en-IN', 'en-GB', 'en-US', 'en-AU', 'en'],
  },
  hi: {
    code: 'hi',
    locale: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    testPhrase: 'यह माइंडमित्र का हिंदी आवाज़ परीक्षण है।',
    fallbackLocales: ['hi-IN', 'hi_IN', 'hi-Deva', 'hi'],
  },
  te: {
    code: 'te',
    locale: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    testPhrase: 'ఇది మైండ్‌మిత్ర తెలుగు వాయిస్ పరీక్ష.',
    fallbackLocales: ['te-IN', 'te_IN', 'te-Telu', 'te'],
  },
};

export interface SpeakResult {
  success: boolean;
  voiceName?: string;
  locale?: string;
  source?: 'browser_native' | 'cloud_fallback' | 'cached_cloud';
  error?: string;
  warning?: string;
}

export interface TTSState {
  isSpeaking: boolean;
  isPreparingCloudAudio: boolean;
  selectedLanguage: Language;
  detectedVoice: SpeechSynthesisVoice | null;
  isVoiceAvailable: boolean;
  ttsProvider: string;
  lastSpokenText: string;
  lastLocale: string;
}

const API_BASE = 'http://127.0.0.1:8000';

class TTSService {
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded = false;
  private listeners: Array<() => void> = [];
  private stateListeners: Array<(state: TTSState) => void> = [];
  private currentLanguage: Language = 'en';
  private isSpeaking = false;
  private isPreparingCloudAudio = false;
  private lastSpokenText = '';
  private currentAudioElement: HTMLAudioElement | null = null;
  private memoryAudioCache: Map<string, string> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
    }
  }

  private initVoices() {
    const loadVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.voices = v;
        this.isLoaded = true;
        this.notifyListeners();
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
      };
    }
  }

  public onVoicesLoaded(cb: () => void): () => void {
    this.listeners.push(cb);
    if (this.isLoaded) cb();
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  public onStateChange(cb: (state: TTSState) => void): () => void {
    this.stateListeners.push(cb);
    cb(this.getState());
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(); } catch {}
    });
    this.notifyState();
  }

  private notifyState() {
    const s = this.getState();
    this.stateListeners.forEach(cb => {
      try { cb(s); } catch {}
    });
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices;
  }

  public getLanguageConfig(lang: Language): LanguageConfig {
    return LANGUAGE_CONFIGS[lang] || LANGUAGE_CONFIGS.en;
  }

  public getBestVoice(lang: Language): SpeechSynthesisVoice | null {
    const config = this.getLanguageConfig(lang);
    const allVoices = this.getAvailableVoices();
    if (!allVoices || allVoices.length === 0) return null;

    const targetLocale = config.locale.toLowerCase().replace('_', '-');
    const targetPrefix = config.code.toLowerCase();

    // 1. Exact locale match
    let match = allVoices.find(v => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang === targetLocale;
    });
    if (match) return match;

    // 2. Fallback locale list
    for (const fb of config.fallbackLocales) {
      const fbClean = fb.toLowerCase().replace('_', '-');
      match = allVoices.find(v => v.lang.toLowerCase().replace('_', '-') === fbClean);
      if (match) return match;
    }

    // 3. Language prefix match
    match = allVoices.find(v => {
      const vLang = v.lang.toLowerCase();
      const vName = v.name.toLowerCase();
      return vLang.startsWith(targetPrefix) || vName.includes(config.name.toLowerCase());
    });
    if (match) return match;

    // 4. For English only, allow en-US/en-GB
    if (lang === 'en') {
      match = allVoices.find(v => v.lang.toLowerCase().startsWith('en'));
      if (match) return match;
      return allVoices[0] || null;
    }

    // Never return English voice for Telugu or Hindi
    return null;
  }

  public isLanguageVoiceAvailable(lang: Language): boolean {
    if (lang === 'en') return true;
    if (lang === 'hi') return this.getBestVoice('hi') !== null;
    // For Telugu: true if native voice exists OR cloud fallback is ready
    return true;
  }

  public setLanguage(lang: Language) {
    if (this.currentLanguage !== lang) {
      this.stop();
      this.currentLanguage = lang;
      this.notifyState();
    }
  }

  public getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  public getState(): TTSState {
    const voice = this.getBestVoice(this.currentLanguage);
    const config = this.getLanguageConfig(this.currentLanguage);

    let provider = 'Browser SpeechSynthesis (Native)';
    if (!voice && this.currentLanguage === 'te') {
      provider = 'Google Cloud Telugu TTS (Fallback)';
    } else if (!voice && this.currentLanguage === 'hi') {
      provider = 'Google Cloud Hindi TTS (Fallback)';
    }

    return {
      isSpeaking: this.isSpeaking,
      isPreparingCloudAudio: this.isPreparingCloudAudio,
      selectedLanguage: this.currentLanguage,
      detectedVoice: voice,
      isVoiceAvailable: this.isLanguageVoiceAvailable(this.currentLanguage),
      ttsProvider: provider,
      lastSpokenText: this.lastSpokenText,
      lastLocale: config.locale,
    };
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
    this.isSpeaking = false;
    this.isPreparingCloudAudio = false;
    this.notifyState();
  }

  /**
   * Fetch Telugu/Cloud TTS audio from backend with memory and localStorage caching
   */
  private async fetchCloudAudio(text: string, locale: string): Promise<string> {
    const cacheKey = `mindmitra_tts_${locale}_${text.trim()}`;
    
    // Check in-memory cache
    if (this.memoryAudioCache.has(cacheKey)) {
      return this.memoryAudioCache.get(cacheKey)!;
    }

    // Check localStorage cache
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        this.memoryAudioCache.set(cacheKey, saved);
        return saved;
      }
    } catch {}

    // Fetch from backend POST /api/tts
    const response = await fetch(`${API_BASE}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: locale }),
    });

    if (!response.ok) {
      throw new Error(`Cloud TTS server returned status ${response.status}`);
    }

    const data = await response.json();
    const audioDataUrl = data.audio_base64;

    // Cache result
    this.memoryAudioCache.set(cacheKey, audioDataUrl);
    try {
      localStorage.setItem(cacheKey, audioDataUrl);
    } catch {}

    return audioDataUrl;
  }

  private playAudioElement(audioSrc: string): Promise<SpeakResult> {
    return new Promise((resolve) => {
      this.stop();
      try {
        const audio = new Audio(audioSrc);
        this.currentAudioElement = audio;

        audio.onplay = () => {
          this.isSpeaking = true;
          this.notifyState();
        };

        audio.onended = () => {
          this.isSpeaking = false;
          this.currentAudioElement = null;
          this.notifyState();
          resolve({
            success: true,
            voiceName: 'Google Cloud Telugu TTS',
            locale: 'te-IN',
            source: 'cloud_fallback',
          });
        };

        audio.onerror = (err) => {
          this.isSpeaking = false;
          this.currentAudioElement = null;
          this.notifyState();
          resolve({
            success: false,
            error: 'Failed to play synthesized audio.',
          });
        };

        audio.play().catch(err => {
          this.isSpeaking = false;
          this.notifyState();
          resolve({
            success: false,
            error: `Audio playback blocked: ${err?.message}`,
          });
        });
      } catch (err: any) {
        this.isSpeaking = false;
        this.notifyState();
        resolve({
          success: false,
          error: err?.message || 'Audio element failure',
        });
      }
    });
  }

  /**
   * Main Speak Method
   * Routes:
   * 1. English/Hindi: browser SpeechSynthesis if native voice exists
   * 2. Telugu: browser voice if exists, otherwise seamless Cloud Telugu TTS fallback
   * 3. Never speaks Telugu text with an English accent!
   */
  public async speak(
    text: string,
    langOverride?: Language,
    options?: { rate?: number; pitch?: number; volume?: number }
  ): Promise<SpeakResult> {
    const lang = langOverride || this.currentLanguage;
    const config = this.getLanguageConfig(lang);
    const nativeVoice = this.getBestVoice(lang);

    this.lastSpokenText = text;

    // Stop any ongoing audio
    this.stop();

    // 1. If native browser voice exists, use browser SpeechSynthesis
    if (nativeVoice) {
      return new Promise((resolve) => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = config.locale;
          utterance.voice = nativeVoice;
          utterance.rate = options?.rate ?? 0.85;
          utterance.pitch = options?.pitch ?? 1.0;
          utterance.volume = options?.volume ?? 1.0;

          utterance.onstart = () => {
            this.isSpeaking = true;
            this.notifyState();
          };

          utterance.onend = () => {
            this.isSpeaking = false;
            this.notifyState();
            resolve({
              success: true,
              voiceName: nativeVoice.name,
              locale: utterance.lang,
              source: 'browser_native',
            });
          };

          utterance.onerror = (evt) => {
            this.isSpeaking = false;
            this.notifyState();
            resolve({
              success: false,
              error: `Browser TTS error: ${evt.error || 'unknown'}`,
            });
          };

          window.speechSynthesis.speak(utterance);
        } catch (err: any) {
          this.isSpeaking = false;
          this.notifyState();
          resolve({
            success: false,
            error: err?.message || 'Failed to initialize browser utterance',
          });
        }
      });
    }

    // 2. If native voice is missing (e.g. Telugu on devices without te-IN voice), use Cloud TTS Fallback
    if (lang === 'te' || lang === 'hi') {
      this.isPreparingCloudAudio = true;
      this.notifyState();

      try {
        const audioSrc = await this.fetchCloudAudio(text, config.locale);
        this.isPreparingCloudAudio = false;
        this.notifyState();
        return await this.playAudioElement(audioSrc);
      } catch (err: any) {
        this.isPreparingCloudAudio = false;
        this.notifyState();
        return {
          success: false,
          locale: config.locale,
          error: `${config.name} voice is temporarily unavailable. Localized text is displayed.`,
          warning: 'voice_temporarily_unavailable',
        };
      }
    }

    // Fallback for English
    return {
      success: false,
      error: 'English voice unavailable.',
    };
  }
}

export const ttsService = new TTSService();
