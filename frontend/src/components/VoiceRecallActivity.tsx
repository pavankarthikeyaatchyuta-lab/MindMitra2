import React, { useState, useEffect, useRef } from 'react';
import { Mic, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Lightbulb, Volume2, Check, RefreshCw, Hand, Undo2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { VoiceService } from '../services/voiceService';
import {
  VoiceSensorTracker,
  VoiceBehavioralVector,
  DEFAULT_VOICE_PROMPTS,
  VoiceRecallPrompt,
  getPromptCategory,
  getPromptQuestion,
  getPromptKeywords,
} from '../services/voiceTelemetry';

interface VoiceRecallActivityProps {
  onComplete: (vector: VoiceBehavioralVector) => void;
  onCancel: () => void;
  hintTrigger?: number;
  onProvideCustomHint?: (hint: string) => void;
}

export default function VoiceRecallActivity({ onComplete, onCancel, hintTrigger, onProvideCustomHint }: VoiceRecallActivityProps) {
  const { language } = useTranslation();
  const [promptIndex, setPromptIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking' | 'completed' | 'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultVector, setResultVector] = useState<VoiceBehavioralVector | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isTouchMode, setIsTouchMode] = useState(false);
  const [touchSelections, setTouchSelections] = useState<string[]>([]);

  const trackerRef = useRef<VoiceSensorTracker>(new VoiceSensorTracker());
  const lastHintTriggerRef = useRef(hintTrigger);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const currentPrompt: VoiceRecallPrompt = DEFAULT_VOICE_PROMPTS[promptIndex];

  const triggerHint = () => {
    const keywords = getPromptKeywords(currentPrompt, language).slice(0, 4);
    const hintMsg = language === 'te'
      ? `సూచన: మైక్రోఫోన్‌లో ప్రశాంతంగా మాట్లాడండి లేదా క్రింది పదాలను ఎంచుకోండి: ${keywords.join(', ')}`
      : language === 'hi'
      ? `सुझाव: माइक्रोफ़ोन में स्वाभाविक रूप से बोलें या नीचे दिए गए शब्द चुनें: ${keywords.join(', ')}`
      : `Hint: Speak naturally into the microphone or tap any of these words: ${keywords.join(', ')}`;

    if (onProvideCustomHint) {
      onProvideCustomHint(hintMsg);
    } else {
      VoiceService.speak(hintMsg, language, true);
    }
  };

  useEffect(() => {
    if (hintTrigger && hintTrigger !== lastHintTriggerRef.current) {
      lastHintTriggerRef.current = hintTrigger;
      triggerHint();
    }
  }, [hintTrigger]);

  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    return () => {
      trackerRef.current.stop();
    };
  }, []);

  const handleSpeakQuestion = () => {
    const question = getPromptQuestion(currentPrompt, language);
    VoiceService.speak(question, language, true);
  };

  const handleStart = async () => {
    setErrorMsg(null);
    trackerRef.current.stop();

    if (!trackerRef.current.isSupported()) {
      setStatus('error');
      setErrorMsg(
        language === 'te'
          ? 'ఈ బ్రౌజర్‌లో స్పీచ్ గుర్తింపు అందుబాటులో లేదు. మీరు క్రింది పదాలను తాకవచ్చు లేదా టచ్ మోడ్‌ని ఉపయోగించవచ్చు.'
          : language === 'hi'
          ? 'इस ब्राउज़र में स्पीच पहचान उपलब्ध नहीं है। आप नीचे दिए गए शब्दों को टैप कर सकते हैं या टच मोड का उपयोग कर सकते हैं।'
          : 'Speech recognition is not supported on this browser. You can tap the words below or use Touch Mode.'
      );
      return;
    }

    try {
      setStatus('listening');
      const vector = await trackerRef.current.startListening(
        currentPrompt,
        language,
        (s) => setStatus(s),
        (t) => {
          setTranscript(t);
          // Match and highlight any spoken keywords
          const lower = t.toLowerCase();
          const kws = getPromptKeywords(currentPrompt, language);
          const matched = kws.filter(k => lower.includes(k.toLowerCase()));
          if (matched.length > 0) {
            setSelectedWords(prev => Array.from(new Set([...prev, ...matched])));
          }
        }
      );
      setResultVector(vector);
      setStatus('completed');
    } catch (err: any) {
      console.warn('Voice recognition notice:', err);
      setStatus('error');
      setErrorMsg(
        language === 'te'
          ? 'వాయిస్ గుర్తింపు తాత్కాలికంగా స్పందించలేదు. మీరు మళ్ళీ మాట్లాడవచ్చు లేదా క్రింది పదాలను ఎంచుకోవచ్చు.'
          : language === 'hi'
          ? 'वॉइस पहचान उपलब्ध नहीं हो सकी। आप पुनः प्रयास कर सकते हैं या नीचे दिए गए शब्दों को चुन सकते हैं।'
          : 'Voice detection was interrupted. You can tap the microphone to retry or tap the words below.'
      );
    }
  };

  const handleStop = () => {
    trackerRef.current.stop();
    if (selectedWords.length > 0 || transcript.trim().length > 0) {
      const now = Date.now();
      const latency = now - sessionStartTimeRef.current;
      const totalCount = Math.max(selectedWords.length, transcript.split(/\s+/).filter(Boolean).length);
      const completeness = Math.min(1.0, totalCount / Math.max(1, currentPrompt.expectedItemCount));
      const vector: VoiceBehavioralVector = {
        response_latency_ms: latency,
        speech_duration_ms: null,
        pause_duration_ms: null,
        number_of_pauses: 0,
        sequence_completeness: completeness,
        task_completion: totalCount >= 2,
        transcript_confidence: null,
        word_count: totalCount,
        timestamp: new Date().toISOString(),
      };
      setResultVector(vector);
      setStatus('completed');
    } else {
      setStatus('idle');
    }
  };

  // Interactive Word Chip Toggle (Hybrid Voice & Touch Support)
  const handleToggleWord = (word: string) => {
    VoiceService.speak(word, language, true);
    setSelectedWords(prev => {
      const updated = prev.includes(word)
        ? prev.filter(w => w !== word)
        : [...prev, word];

      setTranscript(updated.join(', '));

      const now = Date.now();
      const latency = now - sessionStartTimeRef.current;
      const completeness = Math.min(1.0, updated.length / Math.max(1, currentPrompt.expectedItemCount));

      const vector: VoiceBehavioralVector = {
        response_latency_ms: latency,
        speech_duration_ms: null,
        pause_duration_ms: null,
        number_of_pauses: 0,
        sequence_completeness: completeness,
        task_completion: updated.length >= 2,
        transcript_confidence: null,
        word_count: updated.length,
        timestamp: new Date().toISOString(),
      };
      setResultVector(vector);

      if (updated.length >= 3) {
        setStatus('completed');
      }
      return updated;
    });
  };

  // Touch Mode Tile Selection
  const handleTouchTile = (word: string) => {
    VoiceService.speak(word, language, true);
    setTouchSelections(prev => {
      const updated = prev.includes(word)
        ? prev.filter(w => w !== word)
        : [...prev, word];

      if (updated.length >= 3) {
        const now = Date.now();
        const latency = now - sessionStartTimeRef.current;
        const completeness = Math.min(1.0, updated.length / Math.max(1, currentPrompt.expectedItemCount));
        const vector: VoiceBehavioralVector = {
          response_latency_ms: latency,
          speech_duration_ms: null,
          pause_duration_ms: null,
          number_of_pauses: 0,
          sequence_completeness: completeness,
          task_completion: true,
          transcript_confidence: null,
          word_count: updated.length,
          timestamp: new Date().toISOString(),
        };
        setResultVector(vector);
        setStatus('completed');
      }
      return updated;
    });
  };

  const handleFinish = () => {
    if (resultVector) {
      onComplete(resultVector);
    } else {
      const totalCount = selectedWords.length || touchSelections.length;
      const completeness = totalCount > 0 ? Math.min(1.0, totalCount / Math.max(1, currentPrompt.expectedItemCount)) : 0;
      const honestVector: VoiceBehavioralVector = {
        response_latency_ms: null,
        speech_duration_ms: null,
        pause_duration_ms: null,
        number_of_pauses: 0,
        sequence_completeness: completeness,
        task_completion: totalCount >= 2,
        transcript_confidence: null,
        word_count: totalCount,
        timestamp: new Date().toISOString(),
      };
      onComplete(honestVector);
    }
  };

  const promptCategory = getPromptCategory(currentPrompt, language);
  const promptQuestion = getPromptQuestion(currentPrompt, language);
  const keywords = getPromptKeywords(currentPrompt, language);

  const statusText: Record<string, Record<string, string>> = {
    idle: {
      en: 'Tap the microphone or button below to speak',
      te: 'మాట్లాడటానికి మైక్రోఫోన్ లేదా క్రింది బటన్‌ను నొక్కండి',
      hi: 'बोलने के लिए माइक्रोफ़ोन या नीचे दिया गया बटन दबाएं',
    },
    listening: {
      en: 'Listening through speech interface... speak clearly',
      te: 'వాయిస్ ఇంటర్‌ఫేస్ వింటోంది... స్పష్టంగా మాట్లాడండి',
      hi: 'माइक्रोफ़ोन सुन रहा है... स्पष्ट रूप से बोलें',
    },
    speaking: {
      en: 'Detecting speech cadence & natural rhythm...',
      te: 'మీ మాటల వేగం మరియు సహజ క్రమాన్ని గమనిస్తున్నారు...',
      hi: 'आपकी आवाज़ की गति और लय को समझ रहे हैं...',
    },
    completed: {
      en: 'Behavioral response recorded successfully ✓',
      te: 'ప్రవర్తనా స్పందన విజయవంతంగా నమోదయింది ✓',
      hi: 'व्यवहार प्रतिक्रिया सफलतापूर्वक रिकॉर्ड हुई ✓',
    },
    error: {
      en: 'Tap microphone to retry, or select the words below',
      te: 'మళ్ళీ ప్రయత్నించడానికి మైక్రోఫోన్ నొక్కండి లేదా క్రింది పదాలను ఎంచుకోండి',
      hi: 'पुनः प्रयास करने के लिए माइक दबाएं, या नीचे शब्द चुनें',
    },
  };

  const btnTapToSpeak: Record<string, string> = {
    en: 'Tap to Speak',
    te: 'మాట్లాడటానికి నొక్కండి',
    hi: 'बोलने के लिए टैप करें',
  };

  const btnRetry: Record<string, string> = {
    en: 'Retry Speaking',
    te: 'మళ్ళీ మాట్లాడండి',
    hi: 'फिर से बोलें',
  };

  const btnDoneSpeaking: Record<string, string> = {
    en: 'Done Speaking',
    te: 'మాట్లాడటం పూర్తయింది',
    hi: 'बोलना समाप्त',
  };

  const btnContinue: Record<string, string> = {
    en: 'Continue with Results',
    te: 'ఫలితాలతో కొనసాగించండి',
    hi: 'परिणामों के साथ जारी रखें',
  };

  return (
    <div className="card p-5 sm:p-8 max-w-xl mx-auto text-center animate-in fade-in shadow-sm">
      {/* Top Header Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-4 border border-purple-200 dark:border-purple-800">
        <Sparkles size={14} />
        <span>
          {language === 'te'
            ? 'వాయిస్ ప్రవర్తనా సంకేతాలు (పరికర స్పీచ్ ఇంటర్‌ఫేస్)'
            : language === 'hi'
            ? 'वॉइस व्यवहार संकेत (डिवाइस स्पीच इंटरफ़ेस)'
            : 'Voice Behavioral Signals (Device Speech Interface)'}
        </span>
      </div>

      {/* Mode Switch Tab */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            onClick={() => setIsTouchMode(false)}
            type="button"
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              !isTouchMode
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Mic size={14} />
            <span>{language === 'te' ? 'వాయిస్ మోడ్' : language === 'hi' ? 'वॉइस मोड' : 'Voice Mode'}</span>
          </button>
          <button
            onClick={() => setIsTouchMode(true)}
            type="button"
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              isTouchMode
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Hand size={14} />
            <span>{language === 'te' ? 'టచ్ మోడ్' : language === 'hi' ? 'टच मोड' : 'Touch Mode'}</span>
          </button>
        </div>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {promptCategory}
      </h3>

      {/* Spoken Question Prompt with Audio Button */}
      <div className="flex items-center justify-center gap-2 mb-6 max-w-lg mx-auto">
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
          "{promptQuestion}"
        </p>
        <button
          onClick={handleSpeakQuestion}
          type="button"
          className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0 cursor-pointer"
          title="Listen to question aloud"
          aria-label="Listen to question aloud"
        >
          <Volume2 size={18} />
        </button>
      </div>

      {!isTouchMode ? (
        /* ================= VOICE MODE ================= */
        <>
          {/* Interactive Central Microphone Button */}
          <div className="my-5 flex flex-col items-center">
            <button
              onClick={status === 'listening' || status === 'speaking' ? handleStop : handleStart}
              type="button"
              aria-label={status === 'listening' || status === 'speaking' ? 'Stop Listening' : 'Start Speaking'}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all shadow-md cursor-pointer active:scale-95 ${
                status === 'listening'
                  ? 'bg-blue-100 dark:bg-blue-950 border-4 border-blue-500 animate-pulse text-blue-600 ring-4 ring-blue-300/50'
                  : status === 'speaking'
                  ? 'bg-emerald-100 dark:bg-emerald-950 border-4 border-emerald-500 text-emerald-600 ring-4 ring-emerald-300/50 scale-105'
                  : status === 'completed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-3 border-emerald-500 text-emerald-600'
                  : status === 'error'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-3 border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 border-3 border-indigo-400 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:border-indigo-500 hover:scale-105'
              }`}
            >
              {status === 'completed' ? (
                <CheckCircle2 size={46} />
              ) : (
                <Mic size={42} className={status === 'listening' || status === 'speaking' ? 'animate-bounce' : ''} />
              )}
            </button>

            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mt-3 max-w-xs">
              {statusText[status]?.[language] || statusText[status]?.en}
            </p>
          </div>

          {/* Real-time Transcript */}
          {transcript && (
            <div className="p-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {language === 'te' ? 'నమోదైన సమాధానం:' : language === 'hi' ? 'दर्ज उत्तर:' : 'Detected Answer:'}
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-semibold italic">"{transcript}"</p>
            </div>
          )}

          {/* Reassuring Notice if Voice Recognition was Interrupted */}
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 text-left">
              <AlertCircle size={18} className="shrink-0 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Signal Vector Preview if completed */}
          {resultVector && (
            <div className="grid grid-cols-3 gap-2 mb-5 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
                  {language === 'te' ? 'ప్రతిస్పందన ఆలస్యం' : language === 'hi' ? 'प्रतिक्रिया विलंब' : 'First Latency'}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {resultVector.response_latency_ms !== null ? `${(resultVector.response_latency_ms / 1000).toFixed(1)}s` : 'Touch Mode'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
                  {language === 'te' ? 'సంభాషణ సమయం' : language === 'hi' ? 'भाषण अवधि' : 'Speech Duration'}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {resultVector.speech_duration_ms !== null ? `${(resultVector.speech_duration_ms / 1000).toFixed(1)}s` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
                  {language === 'te' ? 'పదాల సంఖ్య' : language === 'hi' ? 'शब्द गणना' : 'Words'}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {resultVector.word_count}
                </span>
              </div>
            </div>
          )}

          {/* Interactive Tap-to-Select Word Chips (Hybrid Speech & Touch) */}
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-left animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Lightbulb size={13} className="text-amber-600" />
                <span>
                  {language === 'te'
                    ? 'సూచించిన పదాలు (తాకండి లేదా మాట్లాడండి):'
                    : language === 'hi'
                    ? 'सुझाए गए शब्द (टैप करें या बोलें):'
                    : 'Suggested words (tap or speak):'}
                </span>
              </span>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                {selectedWords.length} / 3 {language === 'te' ? 'ఎంపిక' : language === 'hi' ? 'चुने' : 'selected'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {keywords.map((kw: string, i: number) => {
                const isSelected = selectedWords.includes(kw);
                return (
                  <button
                    key={i}
                    onClick={() => handleToggleWord(kw)}
                    type="button"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-slate-800 dark:text-slate-200 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {isSelected && <Check size={13} />}
                    <span>"{kw}"</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* ================= TOUCH MODE ================= */
        <div className="my-4 animate-in fade-in">
          <div className="mb-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-900 dark:text-purple-200 text-left flex items-center justify-between">
            <span>
              {language === 'te'
                ? 'మీరు చేసిన 3 పనులను కింద తాకండి:'
                : language === 'hi'
                ? 'आपने जो 3 काम किए, उन्हें नीचे चुनें:'
                : 'Tap the 3 things you did below:'}
            </span>
            <span className="font-extrabold text-purple-700 dark:text-purple-300">
              {touchSelections.length} / 3
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
            {keywords.map((kw, i) => {
              const isSelected = touchSelections.includes(kw);
              return (
                <button
                  key={i}
                  onClick={() => handleTouchTile(kw)}
                  type="button"
                  className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 min-h-[54px] ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/50'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-purple-400'
                  }`}
                >
                  {isSelected && <Check size={16} />}
                  <span>{kw}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons: ALWAYS ACCESSIBLE & USABLE */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {/* Tap to Speak / Retry Speaking Button */}
        {!isTouchMode && (status === 'idle' || status === 'error') && (
          <button
            onClick={handleStart}
            type="button"
            className="w-full sm:w-auto elderly-btn-primary py-3 px-6 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
          >
            {status === 'error' ? <RefreshCw size={18} /> : <Mic size={18} />}
            <span>
              {status === 'error'
                ? (btnRetry[language] || btnRetry.en)
                : (btnTapToSpeak[language] || btnTapToSpeak.en)}
            </span>
          </button>
        )}

        {/* Done Speaking Button */}
        {!isTouchMode && (status === 'listening' || status === 'speaking') && (
          <button
            onClick={handleStop}
            type="button"
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm cursor-pointer shadow-md active:scale-95"
          >
            {btnDoneSpeaking[language] || btnDoneSpeaking.en}
          </button>
        )}

        {/* Continue Button: Available whenever words have been selected or status completed */}
        {(status === 'completed' || selectedWords.length >= 1 || touchSelections.length >= 1) && (
          <button
            onClick={handleFinish}
            type="button"
            className="w-full sm:w-auto elderly-btn-primary py-3 px-7 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 animate-pulse"
          >
            <span>{btnContinue[language] || btnContinue.en}</span>
            <ArrowRight size={18} />
          </button>
        )}

        {/* Hint Assistance */}
        <button
          onClick={triggerHint}
          type="button"
          className="w-full sm:w-auto px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors cursor-pointer min-h-[44px]"
          title="Get hint suggestions"
        >
          <Lightbulb size={16} className="text-amber-600 dark:text-amber-400" />
          <span>{language === 'te' ? 'సూచన (Hint)' : language === 'hi' ? 'सुझाव (Hint)' : 'Hint'}</span>
        </button>
      </div>

      <div className="mt-5 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        🔒 <strong>Speech Privacy & Architecture</strong>: Behavioral voice metrics (reaction latency, duration, pauses) are computed in local volatile memory. Zero raw audio recordings are stored or transmitted by MindMitra.
      </div>
    </div>
  );
}
