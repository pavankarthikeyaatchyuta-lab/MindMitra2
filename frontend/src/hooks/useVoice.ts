import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { Language } from '../types';
import { ttsService, TTSState } from '../services/ttsService';

export const useVoice = () => {
  const { language } = useTranslation();
  const [ttsState, setTtsState] = useState<TTSState>(ttsService.getState());
  
  const [voiceEnabled, setVoiceEnabledState] = useState(() => {
    const saved = localStorage.getItem('mindmitra_voice_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setVoiceEnabledState(enabled);
    localStorage.setItem('mindmitra_voice_enabled', String(enabled));
    if (!enabled) {
      ttsService.stop();
    }
  }, []);

  // Sync language change to ttsService immediately
  useEffect(() => {
    ttsService.setLanguage(language);
  }, [language]);

  // Subscribe to TTS state changes (onvoiceschanged, speech start/end, cloud fetch)
  useEffect(() => {
    const unsubscribe = ttsService.onStateChange((state) => {
      setTtsState(state);
    });
    return () => unsubscribe();
  }, []);

  const speak = useCallback(
    async (text: string, langOverride?: Language) => {
      if (!voiceEnabled || !text) return { success: false, reason: 'disabled' };
      const lang = langOverride || language;
      return await ttsService.speak(text, lang);
    },
    [voiceEnabled, language]
  );

  const stop = useCallback(() => {
    ttsService.stop();
  }, []);

  const testVoice = useCallback(
    async (lang?: Language) => {
      const targetLang = lang || language;
      const config = ttsService.getLanguageConfig(targetLang);
      return await ttsService.speak(config.testPhrase, targetLang);
    },
    [language]
  );

  return {
    speak,
    stop,
    testVoice,
    isSpeaking: ttsState.isSpeaking,
    isPreparingCloudAudio: ttsState.isPreparingCloudAudio,
    voiceEnabled,
    setVoiceEnabled,
    isVoiceAvailable: ttsState.isVoiceAvailable,
    detectedVoice: ttsState.detectedVoice,
    ttsProvider: ttsState.ttsProvider,
    lastLocale: ttsState.lastLocale,
    language,
  };
};
