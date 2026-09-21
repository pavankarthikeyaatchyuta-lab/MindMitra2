import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, ShieldCheck, AlertCircle, UserCheck, HelpCircle, Eye, Upload, Image as ImageIcon } from 'lucide-react';
import { FamiliarPerson } from '../types';

interface CameraRecallActivityProps {
  familiarPerson?: FamiliarPerson | null;
  familiarPeopleList?: FamiliarPerson[];
  onSelectPerson?: (person: FamiliarPerson) => void;
  onComplete: (matchSuccess: boolean, latencyMs: number, recallType?: 'self_confirmed' | 'assisted') => void;
  onCancel: () => void;
}

export default function CameraRecallActivity({
  familiarPerson,
  familiarPeopleList,
  onSelectPerson,
  onComplete,
  onCancel,
}: CameraRecallActivityProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recallStatus, setRecallStatus] = useState<'idle' | 'confirmed' | 'assisted'>('idle');
  const [startTime, setStartTime] = useState<number>(0);

  const [activePerson, setActivePerson] = useState<FamiliarPerson>(() => {
    if (familiarPerson) return familiarPerson;
    if (familiarPeopleList && familiarPeopleList.length > 0) return familiarPeopleList[0];
    return {
      id: 101,
      user_id: 1,
      name: 'Anita Kumar',
      relationship: 'Daughter',
      photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      consent_confirmed: true,
    };
  });

  useEffect(() => {
    if (familiarPerson) {
      setActivePerson(familiarPerson);
    } else if (familiarPeopleList && familiarPeopleList.length > 0) {
      setActivePerson(familiarPeopleList[0]);
    }
  }, [familiarPerson, familiarPeopleList]);

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
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn('Autoplay notice:', e));
        };
      }
      setStreamActive(true);
      setStartTime(performance.now());
    } catch (err: any) {
      console.warn('Camera access unavailable:', err);
      setErrorMsg("Camera access is not available or was denied. Visual aid card mode is active.");
      setStartTime(performance.now());
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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

  const handleCameraRollUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const customPerson: FamiliarPerson = {
            id: Date.now(),
            user_id: activePerson.user_id || 1,
            name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Family Member',
            relationship: 'Camera Roll Upload',
            photo_url: dataUrl,
            consent_confirmed: true,
          };
          setActivePerson(customPerson);
          if (onSelectPerson) onSelectPerson(customPerson);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="card p-6 sm:p-8 max-w-xl mx-auto text-center animate-in fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCameraRollUpload}
      />

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3 border border-blue-200 dark:border-blue-800">
        <Eye size={14} />
        <span>Visual & Familiar Recall Activity</span>
      </div>

      <div className="mb-4 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-slate-900 dark:text-white">Observation Sensor:</span>
        <span className="text-slate-500 dark:text-slate-400">Measuring prompt observation cadence & response latency</span>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Visual & Family Recall
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
        Observe your family member's photo and self-confirm if you recall them.
      </p>

      {/* Familiar People Roll / Carousel */}
      {familiarPeopleList && familiarPeopleList.length > 0 && (
        <div className="mb-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Family Member Roll ({familiarPeopleList.length})
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <Upload size={12} />
              <span>Pick from Camera Roll</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {familiarPeopleList.map((person) => {
              const isSelected = activePerson.id === person.id;
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    setActivePerson(person);
                    if (onSelectPerson) onSelectPerson(person);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 ring-2 ring-blue-400/40 text-blue-900 dark:text-blue-200 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <img
                    src={person.photo_url}
                    alt={person.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold block leading-tight">{person.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-none">{person.relationship}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Target Person Card */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 text-left">
        <div className="flex items-center gap-3">
          <img
            src={activePerson.photo_url}
            alt={activePerson.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400 shadow-xs shrink-0"
          />
          <div>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
              Family Member Photo
            </span>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{activePerson.name}</h4>
            <span className="text-xs text-slate-600 dark:text-slate-400">{activePerson.relationship}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(!familiarPeopleList || familiarPeopleList.length <= 1) && (
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Pick photo from Camera Roll"
            >
              <Upload size={12} />
              <span>Camera Roll</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300 dark:border-emerald-700">
            <ShieldCheck size={14} />
            <span>Familiar Person</span>
          </div>
        </div>
      </div>

      {/* Camera Viewport or Fallback */}
      <div className="relative w-64 h-64 mx-auto rounded-3xl overflow-hidden border-4 border-slate-200 dark:border-slate-700 bg-slate-950 mb-6 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${streamActive ? 'block' : 'hidden'}`}
        />

        {!streamActive && errorMsg && (
          <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
            <Camera size={36} className="mb-2 text-slate-500" />
            <span className="mb-2">Visual aid preview active (photo card mode)</span>
            <button
              onClick={startCamera}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm min-h-[44px] shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              Enable Camera
            </button>
          </div>
        )}

        {!streamActive && !errorMsg && (
          <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
            <Camera size={32} className="mb-2 text-blue-400 animate-pulse" />
            <span>Opening camera...</span>
          </div>
        )}

        {recallStatus === 'confirmed' && (
          <div className="absolute inset-0 bg-emerald-600/85 backdrop-blur-xs flex flex-col items-center justify-center text-white animate-in fade-in p-4">
            <CheckCircle2 size={52} className="mb-2" />
            <span className="font-bold text-base">Self-Confirmed Recall</span>
            <span className="text-xs opacity-90">Recognized {activePerson.name} ({activePerson.relationship})</span>
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
          className="w-full sm:w-auto elderly-btn-primary py-3 px-5 text-sm font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
        >
          <UserCheck size={18} />
          <span>Yes, I recall {activePerson.name}</span>
        </button>

        <button
          onClick={handleNeedHelp}
          disabled={recallStatus !== 'idle'}
          className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <HelpCircle size={16} />
          <span>Need help / Unsure</span>
        </button>

        <button
          onClick={onCancel}
          disabled={recallStatus !== 'idle'}
          className="w-full sm:w-auto px-4 py-3 min-h-[44px] rounded-xl border border-transparent text-xs text-slate-500 dark:text-slate-400 hover:underline flex items-center justify-center cursor-pointer"
        >
          Back to Options
        </button>
      </div>

      <div className="mt-4 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        🛡️ <strong>Privacy & Technical Truthfulness</strong>: This is a memory recall engagement activity. Camera feed is rendered strictly on device in local canvas memory. MindMitra does NOT run automated biometric face matching and never uploads camera frames to the cloud.
      </div>
    </div>
  );
}
