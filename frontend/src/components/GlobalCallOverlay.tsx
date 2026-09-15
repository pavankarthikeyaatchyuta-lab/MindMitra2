import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, PhoneCall, Mic, MicOff, AlertCircle, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { useCall } from '../context/CallContext';

export const GlobalCallOverlay: React.FC = () => {
  const {
    callState,
    activeCall,
    callDuration,
    isMuted,
    callError,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    clearCallState,
  } = useCall();

  if (callState === 'IDLE') return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSafeErrorMessage = () => {
    if (!callError) return "We couldn't establish the voice connection. Please try again.";
    if (callError.toLowerCase().includes('microphone') || callError.toLowerCase().includes('permission')) {
      return "Microphone access was denied. Please allow microphone permissions in your browser.";
    }
    if (callError.toLowerCase().includes('offline') || callError.toLowerCase().includes('unavailable')) {
      return `${activeCall?.displayName || 'Contact'} is currently unavailable.`;
    }
    return "Unable to establish the voice connection. Please try again.";
  };

  return (
    <AnimatePresence>
      {/* 1. Incoming Call Modal */}
      {callState === 'RINGING' && activeCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden"
          >
            {/* Animated ringing pulse circles */}
            <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none">
              <div className="w-64 h-64 bg-blue-500/10 dark:bg-blue-500/20 rounded-full animate-ping duration-1000" />
            </div>

            <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/30 animate-bounce">
              <PhoneCall className="w-10 h-10" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
              ● Incoming Trusted Call
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">
              {activeCall.displayName}
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">
              {activeCall.relationship || 'Trusted Contact'}
            </p>

            <p className="text-xs text-slate-400 dark:text-slate-500 mb-8">
              Caregiver: {activeCall.caregiverName || 'Atchyuta Pavan Karthikeya'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={declineCall}
                className="py-3.5 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-base flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <PhoneOff className="w-5 h-5 text-rose-500" />
                Decline
              </button>

              <button
                onClick={acceptCall}
                className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 animate-pulse"
              >
                <Phone className="w-5 h-5" />
                Accept
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 2. In-Call / Calling / Error HUD */}
      {callState !== 'RINGING' && activeCall && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-6 right-6 z-[9999] max-w-md w-full sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  callState === 'CONNECTED'
                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                    : callState === 'FAILED' || callState === 'UNAVAILABLE' || callState === 'DECLINED'
                    ? 'bg-slate-100 dark:bg-slate-800 text-rose-500'
                    : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 animate-pulse'
                }`}
              >
                {callState === 'CONNECTED' ? (
                  <Phone className="w-6 h-6" />
                ) : callState === 'FAILED' || callState === 'UNAVAILABLE' || callState === 'DECLINED' ? (
                  <PhoneOff className="w-6 h-6" />
                ) : (
                  <PhoneCall className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  {activeCall.displayName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeCall.relationship || 'Trusted Contact'} • {activeCall.caregiverName || 'Caregiver Verified'}
                </p>
              </div>
            </div>

            {callState === 'CONNECTED' && (
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800/40">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(callDuration)}
              </span>
            )}
          </div>

          {/* Status Message Area */}
          <div className="mb-4">
            {callState === 'CALLING' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-xl text-center">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Calling {activeCall.displayName}...
                </p>
                <p className="text-xs text-blue-500/80 mt-0.5">Waiting for {activeCall.displayName} to answer</p>
              </div>
            )}

            {callState === 'CONNECTING' && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-center">
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  Connecting audio stream...
                </p>
              </div>
            )}

            {callState === 'CONNECTED' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Voice Connected
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-400 font-medium">Encrypted WebRTC</span>
              </div>
            )}

            {callState === 'UNAVAILABLE' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {activeCall.displayName} is currently unavailable
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-400 mt-0.5">No answer received. Please try again later.</p>
              </div>
            )}

            {callState === 'DECLINED' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Call Declined</p>
              </div>
            )}

            {callState === 'FAILED' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-rose-200 dark:border-rose-900/40 rounded-xl text-center">
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Call couldn't connect
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{getSafeErrorMessage()}</p>
              </div>
            )}

            {callState === 'ENDED' && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Call Ended</p>
              </div>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3">
            {callState === 'CONNECTED' && (
              <button
                onClick={toggleMute}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border transition-all ${
                  isMuted
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isMuted ? 'Unmute' : 'Mute Mic'}
              </button>
            )}

            {(callState === 'CALLING' || callState === 'CONNECTING' || callState === 'CONNECTED') && (
              <button
                onClick={endCall}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 transition-transform active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </button>
            )}

            {(callState === 'FAILED' || callState === 'UNAVAILABLE' || callState === 'DECLINED' || callState === 'ENDED') && (
              <button
                onClick={clearCallState}
                className="w-full py-3 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all"
              >
                Dismiss
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
