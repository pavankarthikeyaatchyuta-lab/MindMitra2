import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, ShieldCheck, AlertCircle, UserCheck, HelpCircle, Eye } from 'lucide-react';
import { FamiliarPerson } from '../types';

interface CameraRecallActivityProps {
  familiarPerson?: FamiliarPerson | null;
  onComplete: (matchSuccess: boolean, latencyMs: number, recallType?: 'self_confirmed' | 'assisted') => void;
  onCancel: () => void;
}

export default function CameraRecallActivity({ familiarPerson, onComplete, onCancel }: CameraRecallActivityProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recallStatus, setRecallStatus] = useState<'idle' | 'confirmed' | 'assisted'>('idle');
  const [startTime, setStartTime] = useState<number>(0);

  const targetPerson = familiarPerson || {
    id: 99,
    user_id: 1,
    name: 'Ananya',
    relationship: 'Granddaughter',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    consent_confirmed: true,
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser environment');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
        setStartTime(performance.now());
      }
    } catch (err: any) {
      console.warn('Camera access unavailable:', err);
      setErrorMsg("Camera access is not available or was denied. You can still complete this visual recall exercise using the photo card.");
      setStartTime(performance.now());
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setStreamActive(false);
  };

  const handleSelfConfirmed = () => {
    const latency = startTime > 0 ? Math.round(performance.now() - startTime) : 1600;
    setRecallStatus('confirmed');
    stopCamera();
    setTimeout(() => {
      onComplete(true, latency, 'self_confirmed');
    }, 1000);
  };

  const handleNeedHelp = () => {
    const latency = startTime > 0 ? Math.round(performance.now() - startTime) : 3200;
    setRecallStatus('assisted');
    stopCamera();
    setTimeout(() => {
      onComplete(false, latency, 'assisted');
    }, 1000);
  };

  return (
    <div className="card p-6 sm:p-8 max-w-xl mx-auto text-center animate-in fade-in">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200 dark:border-blue-800">
        <Eye size={14} />
        <span>Camera-Assisted Familiar Recall</span>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Familiar Person Recall
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
        Look at your family member's photo and self-confirm if you recall them.
      </p>

      {/* Target Person Card */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-4 mb-6 text-left">
        <div className="flex items-center gap-3">
          <img
            src={targetPerson.photo_url}
            alt={targetPerson.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-indigo-400"
          />
          <div>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
              Family Member Photo
            </span>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{targetPerson.name}</h4>
            <span className="text-xs text-slate-600 dark:text-slate-400">{targetPerson.relationship}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300 dark:border-emerald-700">
          <ShieldCheck size={14} />
          <span>Caregiver Approved</span>
        </div>
      </div>

      {/* Camera Viewport or Fallback */}
      <div className="relative w-64 h-64 mx-auto rounded-3xl overflow-hidden border-4 border-slate-200 dark:border-slate-700 bg-slate-950 mb-6 flex items-center justify-center">
        {streamActive ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : errorMsg ? (
          <div className="p-4 text-center text-xs text-slate-400">
            <Camera size={36} className="mx-auto mb-2 text-slate-500" />
            <span>Visual aid preview active (photo card mode)</span>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-400">
            <Camera size={30} className="mx-auto mb-2 text-blue-500" />
            <span>Opening camera...</span>
          </div>
        )}

        {recallStatus === 'confirmed' && (
          <div className="absolute inset-0 bg-emerald-600/85 backdrop-blur-xs flex flex-col items-center justify-center text-white animate-in fade-in p-4">
            <CheckCircle2 size={52} className="mb-2" />
            <span className="font-bold text-base">Self-Confirmed Recall</span>
            <span className="text-xs opacity-90">Recognized {targetPerson.name} ({targetPerson.relationship})</span>
          </div>
        )}

        {recallStatus === 'assisted' && (
          <div className="absolute inset-0 bg-blue-600/85 backdrop-blur-xs flex flex-col items-center justify-center text-white animate-in fade-in p-4">
            <HelpCircle size={52} className="mb-2" />
            <span className="font-bold text-base">Assistance Logged</span>
            <span className="text-xs opacity-90">Pacing adjusted for gentle recall</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 mb-6 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 text-left">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Buttons with Honest Self-Confirmation */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleSelfConfirmed}
          disabled={recallStatus !== 'idle'}
          className="w-full sm:w-auto elderly-btn-primary py-3 px-5 text-sm font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
        >
          <UserCheck size={18} />
          <span>Yes, I recall {targetPerson.name}</span>
        </button>

        <button
          onClick={handleNeedHelp}
          disabled={recallStatus !== 'idle'}
          className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
        >
          <HelpCircle size={16} />
          <span>Need help / Unsure</span>
        </button>

        <button
          onClick={onCancel}
          disabled={recallStatus !== 'idle'}
          className="w-full sm:w-auto px-3 py-3 rounded-xl border border-transparent text-xs text-slate-500 hover:underline"
        >
          Back to Touch
        </button>
      </div>

      <div className="mt-4 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        🛡️ <strong>Privacy & Technical Truthfulness</strong>: This is a memory recall engagement activity. Camera feed is rendered strictly on device in local canvas memory. MindMitra does NOT run automated biometric face matching and never uploads camera frames to the cloud.
      </div>
    </div>
  );
}

