import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { VoiceSensorTracker, VoiceBehavioralVector, DEFAULT_VOICE_PROMPTS, VoiceRecallPrompt } from '../services/voiceTelemetry';

interface VoiceRecallActivityProps {
  onComplete: (vector: VoiceBehavioralVector) => void;
  onCancel: () => void;
}

export default function VoiceRecallActivity({ onComplete, onCancel }: VoiceRecallActivityProps) {
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

  const handleStart = async () => {
    setErrorMsg(null);
    setTranscript('');
    setResultVector(null);

    if (!trackerRef.current.isSupported()) {
      setErrorMsg("Voice interaction isn't available on this browser/device. Continuing with touch-based activity.");
      return;
    }

    try {
      const vector = await trackerRef.current.startListening(
        currentPrompt,
        (s) => setStatus(s),
        (t) => setTranscript(t)
      );
      setResultVector(vector);
      setStatus('completed');
    } catch (err: any) {
      console.warn('Voice recognition error:', err);
      setStatus('error');
      setErrorMsg("Microphone input ended or permission not granted. You can proceed with touch interaction.");
    }
  };

  const handleFinish = () => {
    if (resultVector) {
      onComplete(resultVector);
    } else {
      // Fallback dummy completed vector if user finished manually
      const fallbackVector: VoiceBehavioralVector = {
        response_latency_ms: 1850,
        speech_duration_ms: 4200,
        pause_duration_ms: 600,
        number_of_pauses: 1,
        sequence_completeness: 1.0,
        task_completion: true,
        transcript_confidence: 0.92,
        word_count: 8,
        timestamp: new Date().toISOString(),
      };
      onComplete(fallbackVector);
    }
  };

  return (
    <div className="card p-6 sm:p-8 max-w-xl mx-auto text-center animate-in fade-in">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-4 border border-purple-200 dark:border-purple-800">
        <Sparkles size={14} />
        <span>Verbal Sequence Recall (Edge Processing)</span>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {currentPrompt.category}
      </h3>
      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mb-6 font-medium leading-relaxed">
        "{currentPrompt.question}"
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
          {status === 'idle' && 'Tap the button below and speak clearly'}
          {status === 'listening' && 'Listening for your voice...'}
          {status === 'speaking' && 'Detecting speech cadence & pauses...'}
          {status === 'completed' && 'Speech analyzed on device ✓'}
          {status === 'error' && 'Voice detection paused'}
        </p>
      </div>

      {/* Real-time Transcript */}
      {transcript && (
        <div className="p-3.5 mb-6 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Live Transcript:</span>
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
      {resultVector && (
        <div className="grid grid-cols-3 gap-2 mb-6 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">First Latency</span>
            <span className="font-extrabold text-slate-900 dark:text-white">{(resultVector.response_latency_ms / 1000).toFixed(1)}s</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">Speech Duration</span>
            <span className="font-extrabold text-slate-900 dark:text-white">{(resultVector.speech_duration_ms / 1000).toFixed(1)}s</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">Hesitation Pauses</span>
            <span className="font-extrabold text-slate-900 dark:text-white">{resultVector.number_of_pauses}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {status !== 'completed' ? (
          <>
            <button
              onClick={handleStart}
              className="w-full sm:w-auto elderly-btn-primary py-3 px-6 text-sm font-bold flex items-center justify-center gap-2"
            >
              <Mic size={18} />
              <span>{status === 'listening' ? 'Listening...' : 'Start Voice Recall'}</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Continue with Touch Only
            </button>
          </>
        ) : (
          <button
            onClick={handleFinish}
            className="w-full sm:w-auto elderly-btn-primary py-3 px-8 text-sm font-bold flex items-center justify-center gap-2"
          >
            <span>Proceed to Personal Pattern Evaluation</span>
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4">
        🔒 Audio is analyzed locally on device. No voice recordings are uploaded to external clouds.
      </p>
    </div>
  );
}
