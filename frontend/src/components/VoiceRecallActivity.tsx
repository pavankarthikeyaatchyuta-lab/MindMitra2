import React, { useState, useEffect, useRef } from 'react';
import { Mic, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n';
import {
  VoiceSensorTracker,
  VoiceBehavioralVector,
  DEFAULT_VOICE_PROMPTS,
  VoiceRecallPrompt,
  getPromptCategory,
  getPromptQuestion,
} from '../services/voiceTelemetry';

interface VoiceRecallActivityProps {
  onComplete: (vector: VoiceBehavioralVector) => void;
  onCancel: () => void;
}

export default function VoiceRecallActivity({ onComplete, onCancel }: VoiceRecallActivityProps) {
  const { language } = useTranslation();
  const [promptIndex, setPromptIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking' | 'completed' | 'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultVector, setResultVector] = useState<VoiceBehavioralVector | null>(null);

  const trackerRef = useRef<VoiceSensorTracker>(new VoiceSensorTracker());
  const currentPrompt: VoiceRecallPrompt = DEFAULT_VOICE_PROMPTS[promptIndex];

  useEffect(() => {
    return () => {
      trackerRef.current.stop();
    };
  }, []);

  const fallbackUnsupportedMsg: Record<string, string> = {
    te: 'ఈ పరికరంలో తెలుగు వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు. మీరు టచ్ మోడ్‌ని ఉపయోగించవచ్చు.',
    hi: 'इस डिवाइस पर वॉइस इनपुट उपलब्ध नहीं है। आप टच मोड का उपयोग जारी रख सकते हैं।',
    en: 'Voice interaction is unavailable on this device. You can continue using touch mode.',
  };

  const fallbackMicErrorMsg: Record<string, string> = {
    te: 'మైక్రోఫోన్ ఇన్పుట్ ముగిసింది లేదా అనుమతి ఇవ్వబడలేదు. మీరు టచ్ మోడ్‌తో కొనసాగవచ్చు.',
    hi: 'माइक्रोफ़ोन इनपुट समाप्त हुआ या अनुमति नहीं मिली। आप टच मोड से जारी रख सकते हैं।',
    en: 'Microphone input ended or permission not granted. You can proceed with touch interaction.',
  };

  const handleStart = async () => {
    setErrorMsg(null);
    setTranscript('');
    setResultVector(null);

    if (!trackerRef.current.isSupported()) {
      setErrorMsg(fallbackUnsupportedMsg[language] || fallbackUnsupportedMsg.en);
      return;
    }

    try {
      const vector = await trackerRef.current.startListening(
        currentPrompt,
        language,
        (s) => setStatus(s),
        (t) => setTranscript(t)
      );
      setResultVector(vector);
      setStatus('completed');
    } catch (err: any) {
      console.warn('Voice recognition error:', err);
      setStatus('error');
      setErrorMsg(fallbackMicErrorMsg[language] || fallbackMicErrorMsg.en);
    }
  };

  const handleFinish = () => {
    if (resultVector && resultVector.word_count > 0) {
      onComplete(resultVector);
    } else {
      onCancel();
    }
  };

  const promptCategory = getPromptCategory(currentPrompt, language);
  const promptQuestion = getPromptQuestion(currentPrompt, language);

  const statusText: Record<string, Record<string, string>> = {
    idle: {
      en: 'Tap the button below and speak clearly',
      te: 'క్రింది బటన్‌ను నొక్కి స్పష్టంగా మాట్లాడండి',
      hi: 'नीचे दिए गए बटन को दबाएं और स्पष्ट रूप से बोलें',
    },
    listening: {
      en: 'Listening through device speech interface...',
      te: 'పరికర వాయిస్ ఇంటర్‌ఫేస్ ద్వారా వింటున్నారు...',
      hi: 'डिवाइस वॉइस इंटरफ़ेस से सुन रहे हैं...',
    },
    speaking: {
      en: 'Detecting speech cadence & pauses...',
      te: 'మాటల వేగం మరియు విరామాలను గమనిస్తున్నారు...',
      hi: 'बोलने की गति और ठहराव का पता लगा रहे हैं...',
    },
    completed: {
      en: 'Speech behavioral metrics recorded ✓',
      te: 'వాయిస్ ప్రవర్తనా సంకేతాలు రికార్డ్ చేయబడ్డాయి ✓',
      hi: 'वॉइस व्यवहार मेट्रिक्स रिकॉर्ड किए गए ✓',
    },
    error: {
      en: 'Voice detection unavailable',
      te: 'వాయిస్ గుర్తింపు అందుబాటులో లేదు',
      hi: 'वॉइस पहचान उपलब्ध नहीं है',
    },
  };

  const btnTapToSpeak: Record<string, string> = {
    en: 'Tap to Speak',
    te: 'మాట్లాడటానికి నొక్కండి',
    hi: 'बोलने के लिए टैप करें',
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

  const btnSwitchTouch: Record<string, string> = {
    en: 'Switch to Touch Mode',
    te: 'టచ్ మోడ్‌కి మారండి',
    hi: 'टच मोड पर जाएं',
  };

  return (
    <div className="card p-6 sm:p-8 max-w-xl mx-auto text-center animate-in fade-in">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-4 border border-purple-200 dark:border-purple-800">
        <Sparkles size={14} />
        <span>
          {language === 'te'
            ? 'వాయిస్ ప్రవర్తనా సంకేతాలు (పరికర స్పీచ్ ఇంటర్‌ఫేస్)'
            : language === 'hi'
            ? 'वॉइस व्यवहार संकेत (डिवाइस स्पीच इंटरफ़ेस)'
            : 'Voice Behavioral Signals (Device Speech Interface)'}
        </span>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {promptCategory}
      </h3>
      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mb-6 font-medium leading-relaxed">
        "{promptQuestion}"
      </p>

      {/* Voice Status Visualizer */}
      <div className="my-6 flex flex-col items-center">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            status === 'listening'
              ? 'bg-blue-100 dark:bg-blue-950 border-4 border-blue-500 animate-pulse text-blue-600'
              : status === 'speaking'
              ? 'bg-emerald-100 dark:bg-emerald-950 border-4 border-emerald-500 text-emerald-600 scale-105'
              : status === 'completed'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 text-emerald-600'
              : 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          {status === 'completed' ? (
            <CheckCircle2 size={44} />
          ) : (
            <Mic size={40} />
          )}
        </div>

        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-3">
          {statusText[status]?.[language] || statusText[status]?.en}
        </p>
      </div>

      {/* Real-time Transcript */}
      {transcript && (
        <div className="p-3.5 mb-6 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            {language === 'te' ? 'ప్రత్యక్ష లిప్యంతరీకరణ:' : language === 'hi' ? 'लाइव ट्रांसक्रिप्ट:' : 'Live Transcript:'}
          </span>
          <p className="text-slate-800 dark:text-slate-200 italic">"{transcript}"</p>
        </div>
      )}

      {/* Error Fallback Notice */}
      {errorMsg && (
        <div className="p-3 mb-6 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 text-left">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Signal Vector Preview if completed */}
      {resultVector && resultVector.word_count > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
              {language === 'te' ? 'ప్రతిస్పందన ఆలస్యం' : language === 'hi' ? 'प्रतिक्रिया विलंब' : 'First Latency'}
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {(resultVector.response_latency_ms / 1000).toFixed(1)}s
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
              {language === 'te' ? 'సంభాషణ సమయం' : language === 'hi' ? 'भाषण अवधि' : 'Speech Duration'}
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {(resultVector.speech_duration_ms / 1000).toFixed(1)}s
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
              {language === 'te' ? 'పదాల సంఖ్య' : language === 'hi' ? 'शब्द गणना' : 'Word Count'}
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {resultVector.word_count}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {status === 'idle' && (
          <button
            onClick={handleStart}
            className="w-full sm:w-auto elderly-btn-primary py-3 px-6 text-sm font-bold flex items-center justify-center gap-2"
          >
            <Mic size={18} />
            <span>{btnTapToSpeak[language] || btnTapToSpeak.en}</span>
          </button>
        )}

        {(status === 'listening' || status === 'speaking') && (
          <button
            onClick={() => trackerRef.current.stop()}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm"
          >
            {btnDoneSpeaking[language] || btnDoneSpeaking.en}
          </button>
        )}

        {status === 'completed' && resultVector && resultVector.word_count > 0 && (
          <button
            onClick={handleFinish}
            className="w-full sm:w-auto elderly-btn-primary py-3 px-6 text-sm font-bold flex items-center justify-center gap-2"
          >
            <span>{btnContinue[language] || btnContinue.en}</span>
            <ArrowRight size={18} />
          </button>
        )}

        <button
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {btnSwitchTouch[language] || btnSwitchTouch.en}
        </button>
      </div>

      <div className="mt-4 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        🔒 <strong>Speech Privacy & Architecture</strong>: Behavioral voice metrics (reaction latency, duration, pauses) are computed in local memory through the browser/device speech recognition interface. Zero raw audio recordings are stored or transmitted by MindMitra.
      </div>
    </div>
  );
}
