import React, { useEffect, useState } from 'react';
import { Volume2, HelpCircle, AlertCircle } from 'lucide-react';
import { Language } from '../types';
import { InstructionService } from '../services/instructionService';
import { VoiceService, VoiceState } from '../services/voiceService';

interface SynchronizedVoiceBannerProps {
  currentText?: string;
  language?: Language;
  onListenAgain?: () => void;
  onHelp?: () => void;
  voiceUnavailableOverride?: boolean;
  className?: string;
}

export default function SynchronizedVoiceBanner({
  currentText,
  language = 'en',
  onListenAgain,
  onHelp,
  voiceUnavailableOverride,
  className = 'mb-4',
}: SynchronizedVoiceBannerProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceService.getState());

  useEffect(() => {
    const unsub = VoiceService.subscribe(setVoiceState);
    return unsub;
  }, []);

  const activeLanguage: Language = language || voiceState.currentLanguage || 'en';

  const fallbackTextByLang: Record<Language, string> = {
    en: 'Listen to instructions and complete at your own pace.',
    te: 'సూచనలను విని మీ స్వంత వేగంతో వ్యాయామాన్ని పూర్తి చేయండి.',
    hi: 'निर्देश सुनें और अपनी स्वाभाविक गति से अभ्यास पूरा करें।',
  };

  const displayText = (voiceState.isSpeaking && voiceState.currentText && voiceState.currentLanguage === activeLanguage)
    ? voiceState.currentText
    : (currentText || (voiceState.currentLanguage === activeLanguage ? voiceState.currentText : '') || fallbackTextByLang[activeLanguage] || fallbackTextByLang.en);

  const handleListenAgain = () => {
    if (onListenAgain) {
      onListenAgain();
    } else if (displayText) {
      VoiceService.speak(displayText, activeLanguage, true);
    }
  };

  const handleHelp = () => {
    if (onHelp) {
      onHelp();
    } else {
      VoiceService.speak(InstructionService.getCommon('help', activeLanguage), activeLanguage, true);
    }
  };

  const showUnavailable = voiceUnavailableOverride || (!voiceState.isVoiceAvailable && activeLanguage !== 'en');

  return (
    <div className={`w-full ${className}`}>
      {/* Voice Unavailable Fallback Warning */}
      {showUnavailable && (
        <div className="mb-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{InstructionService.getCommon('voice_unavailable', activeLanguage)}</span>
        </div>
      )}

      {/* Main Synchronized Voice & Caption Card */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${
        voiceState.isSpeaking
          ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 shadow-sm ring-2 ring-blue-400/30'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Synchronized Text + Wave Indicator */}
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              voiceState.isSpeaking
                ? 'bg-blue-600 text-white animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              <Volume2 className={`w-5 h-5 ${voiceState.isSpeaking ? 'scale-110' : ''}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {voiceState.isSpeaking ? 'Voice Assistant Speaking' : 'Instructions'}
                </span>
                {voiceState.isSpeaking && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 animate-pulse">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 leading-snug mt-0.5 break-words">
                "{displayText}"
              </p>
            </div>
          </div>

          {/* Action Buttons: Listen Again & Help */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={onListenAgain}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors min-h-[40px] focus:outline-hidden focus:ring-2 focus:ring-blue-500/50"
              title={InstructionService.getCommon('listen_again', language)}
            >
              <Volume2 className="w-4 h-4" />
              <span>{InstructionService.getCommon('listen_again', language)}</span>
            </button>

            <button
              onClick={onHelp}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors min-h-[40px] focus:outline-hidden focus:ring-2 focus:ring-slate-400/40"
              title={InstructionService.getCommon('help', language)}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{InstructionService.getCommon('help', language)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
