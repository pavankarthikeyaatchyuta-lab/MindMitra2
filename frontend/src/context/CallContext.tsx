
// Web Audio Tone Synthesizers for Ringtone & Ringback
let ringAudioCtx: AudioContext | null = null;
let ringOscillator: OscillatorNode | null = null;
let ringGain: GainNode | null = null;
let ringInterval: any = null;

function playRingtone() {
  stopRingtone();
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    ringAudioCtx = new AudioContextClass();
    
    const playPulse = () => {
      if (!ringAudioCtx || ringAudioCtx.state === 'closed') return;
      try {
        const osc1 = ringAudioCtx.createOscillator();
        const osc2 = ringAudioCtx.createOscillator();
        const gain = ringAudioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, ringAudioCtx.currentTime); // A4
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, ringAudioCtx.currentTime); // B4

        gain.gain.setValueAtTime(0.12, ringAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ringAudioCtx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ringAudioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ringAudioCtx.currentTime + 1.2);
        osc2.stop(ringAudioCtx.currentTime + 1.2);
      } catch (e) {}
    };

    playPulse();
    ringInterval = setInterval(playPulse, 2500);
  } catch (e) {}
}

function stopRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (ringAudioCtx && ringAudioCtx.state !== 'closed') {
    try {
      ringAudioCtx.close();
    } catch (e) {}
    ringAudioCtx = null;
  }
}

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { api } from '../services/api';
import { useAppContext } from './AppContext';
import { TrustedConnection } from '../types';

export type CallState =
  | 'IDLE'
  | 'CALLING'
  | 'RINGING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DECLINED'
  | 'UNAVAILABLE'
  | 'FAILED'
  | 'ENDED';

export interface ActiveCallInfo {
  targetUserId: number;
  displayName: string;
  relationship?: string;
  caregiverName?: string;
  callerProfileId?: number;
  callId?: string;
  isIncoming: boolean;
}

interface CallContextType {
  callState: CallState;
  activeCall: ActiveCallInfo | null;
  callDuration: number;
  isMuted: boolean;
  callError: string | null;
  startCall: (contact: TrustedConnection) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  clearCallState: () => void;
}

const CallContext = createContext<CallContextType>({
  callState: 'IDLE',
  activeCall: null,
  callDuration: 0,
  isMuted: false,
  callError: null,
  startCall: async () => {},
  acceptCall: async () => {},
  declineCall: async () => {},
  endCall: async () => {},
  toggleMute: () => {},
  clearCallState: () => {},
});

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export function CallProvider({ children }: { children: ReactNode }) {
  const { currentUser, currentProfile, caregiver } = useAppContext();
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callError, setCallError] = useState<string | null>(null);

  // References to WebRTC instances and timers
  const peerConnRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringTimeoutTimerRef = useRef<any>(null);
  const pendingOfferPayloadRef = useRef<any>(null);

  // Current active user identity (Profile ID or Caregiver ID)
  const activeUserId = currentProfile?.id || currentUser?.id || caregiver?.id || null;

  // Cleanup helper
  const teardownCallResources = () => {
    if (ringTimeoutTimerRef.current) {
      clearTimeout(ringTimeoutTimerRef.current);
      ringTimeoutTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnRef.current) {
      try {
        peerConnRef.current.close();
      } catch (e) {}
      peerConnRef.current = null;
    }
    pendingOfferPayloadRef.current = null;
  };

  // 1. Continuous Heartbeat (every 2.5 seconds)
  useEffect(() => {
    if (!activeUserId) return;
    const sendBeat = async () => {
      try {
        await api.sendPresenceHeartbeat(activeUserId);
      } catch (e) {}
    };
    sendBeat();
    const interval = setInterval(sendBeat, 2500);
    return () => clearInterval(interval);
  }, [activeUserId]);

  // 2. Duration Timer when Connected
  useEffect(() => {
    let interval: any = null;
    if (callState === 'CONNECTED') {
      setCallDuration(0);
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (callState === 'IDLE') {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  // 3. Continuous Background Signaling Poller (every 1.0 second)
  useEffect(() => {
    if (!activeUserId) return;

    let isPolling = false;
    const pollSignals = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const res = await api.pollCallSignals(activeUserId);
        if (res && res.signals && res.signals.length > 0) {
          for (const sig of res.signals) {
            await handleIncomingSignal(sig);
          }
        }
      } catch (e) {
      } finally {
        isPolling = false;
      }
    };

    pollSignals();
    const interval = setInterval(pollSignals, 1000);
    return () => clearInterval(interval);
  }, [activeUserId, callState, activeCall]);

  // Signal Handler
  const handleIncomingSignal = async (sig: any) => {
    const { signal_type, payload, caller_name, caller_relationship, caller_profile_id, call_id } = sig;

    if (signal_type === 'incoming_call' || signal_type === 'offer') {
      if (callState === 'IDLE' || callState === 'ENDED' || callState === 'DECLINED' || callState === 'UNAVAILABLE') {
        pendingOfferPayloadRef.current = payload;
        setActiveCall({
          targetUserId: caller_profile_id,
          displayName: caller_name || `User #${caller_profile_id}`,
          relationship: caller_relationship || 'Neighbor',
          caregiverName: 'Atchyuta Pavan Karthikeya',
          callerProfileId: caller_profile_id,
          callId: call_id,
          isIncoming: true,
        });
        setCallError(null);
        setCallState('RINGING');

        // Ring timeout for recipient (auto-dismiss after 25s if unanswered)
        if (ringTimeoutTimerRef.current) clearTimeout(ringTimeoutTimerRef.current);
        ringTimeoutTimerRef.current = setTimeout(() => {
          setCallState((curr) => {
            if (curr === 'RINGING') {
              teardownCallResources();
              setActiveCall(null);
              return 'IDLE';
            }
            return curr;
          });
        }, 25000);
      }
    } else if (signal_type === 'answer') {
      if (callState === 'CALLING' || callState === 'CONNECTING' || callState === 'RINGING') {
        if (ringTimeoutTimerRef.current) {
          clearTimeout(ringTimeoutTimerRef.current);
          ringTimeoutTimerRef.current = null;
        }
        if (peerConnRef.current && payload) {
          try {
            if (peerConnRef.current.signalingState !== 'stable') {
              await peerConnRef.current.setRemoteDescription(new RTCSessionDescription(payload));
            }
          } catch (e: any) {
            console.warn('[WebRTC] Remote answer set notice:', e);
          }
        }
        setCallState('CONNECTED');
        setCallError(null);
      }
    } else if (signal_type === 'ice-candidate') {
      if (peerConnRef.current && payload) {
        try {
          await peerConnRef.current.addIceCandidate(new RTCIceCandidate(payload));
        } catch (e) {}
      }
    } else if (signal_type === 'declined') {
      if (callState === 'CALLING' || callState === 'CONNECTING') {
        teardownCallResources();
        setCallState('DECLINED');
        setTimeout(() => {
          setCallState('IDLE');
          setActiveCall(null);
        }, 3500);
      }
    } else if (signal_type === 'hangup') {
      teardownCallResources();
      setCallState('ENDED');
      setTimeout(() => {
        setCallState('IDLE');
        setActiveCall(null);
      }, 2500);
    }
  };

  // Sound effects on call state change
  useEffect(() => {
    if (callState === 'RINGING' || callState === 'CALLING') {
      playRingtone();
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [callState]);

  // Action: Start Outgoing Call
  const startCall = async (contact: TrustedConnection) => {
    const targetUserId = contact.target_user_id || contact.contact_user_id;
    if (!targetUserId) {
      setCallError('Cannot place call: Contact does not have a linked MindMitra account.');
      setCallState('FAILED');
      return;
    }

    if (!activeUserId) {
      setCallError('Cannot place call: Please select an active user profile first.');
      setCallState('FAILED');
      return;
    }

    const contactName = contact.display_name || contact.contact_name || 'Contact';

    // 1. Pre-call Real-Time Presence Verification
    try {
      const pres = await api.getCallPresence(targetUserId);
      if (!pres.online) {
        setCallError(`${contactName} is currently unavailable.`);
        setActiveCall({
          targetUserId,
          displayName: contactName,
          relationship: contact.relationship,
          caregiverName: contact.caregiver_name || 'Atchyuta Pavan Karthikeya',
          isIncoming: false,
        });
        setCallState('UNAVAILABLE');
        setTimeout(() => {
          setCallState('IDLE');
          setActiveCall(null);
        }, 4000);
        return;
      }
    } catch (e) {
      // If presence network check encounters error, continue with call setup attempt
    }

    setCallError(null);
    setCallState('CALLING');
    setActiveCall({
      targetUserId,
      displayName: contactName,
      relationship: contact.relationship,
      caregiverName: contact.caregiver_name || 'Atchyuta Pavan Karthikeya',
      callerProfileId: activeUserId,
      isIncoming: false,
    });

    try {
      // 2. Acquire Local Microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      } catch (micErr: any) {
        teardownCallResources();
        setCallError('Microphone access was denied. Please allow microphone permissions in your browser.');
        setCallState('FAILED');
        return;
      }

      // 3. Setup RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnRef.current = pc;

      // Add local audio tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote audio stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (!remoteAudioRef.current) {
            const audio = new Audio();
            audio.autoplay = true;
            remoteAudioRef.current = audio;
          }
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Connection state listener
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          setCallState('CONNECTED');
        } else if (state === 'failed' || state === 'disconnected') {
          teardownCallResources();
          setCallError('Voice connection lost. Please try again.');
          setCallState('FAILED');
          setTimeout(() => {
            setCallState('IDLE');
            setActiveCall(null);
          }, 4000);
        }
      };

      // Send ICE candidates to target user
      pc.onicecandidate = (event) => {
        if (event.candidate && activeUserId) {
          api.sendCallSignal(activeUserId, targetUserId, 'ice-candidate', event.candidate.toJSON());
        }
      };

      // 4. Create Offer & Dispatch Signal
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      const callerName = currentProfile?.display_name || currentUser?.display_name || (caregiver ? caregiver.name : 'Polayya');
      await api.sendCallSignal(activeUserId, targetUserId, 'offer', offer, undefined, callerName);

      // 5. 25-Second Ring Timeout
      if (ringTimeoutTimerRef.current) clearTimeout(ringTimeoutTimerRef.current);
      ringTimeoutTimerRef.current = setTimeout(() => {
        setCallState((curr) => {
          if (curr === 'CALLING' || curr === 'CONNECTING') {
            teardownCallResources();
            setCallError(`${contactName} is currently unavailable.`);
            return 'UNAVAILABLE';
          }
          return curr;
        });
        setTimeout(() => {
          setCallState((c) => (c === 'UNAVAILABLE' ? 'IDLE' : c));
          setActiveCall(null);
        }, 4000);
      }, 25000);
    } catch (err: any) {
      console.error('[WebRTC] Call setup error:', err);
      teardownCallResources();
      setCallError('Unable to establish call connection. Please try again.');
      setCallState('FAILED');
    }
  };

  // Action: Accept Incoming Call
  const acceptCall = async () => {
    if (!activeCall || !pendingOfferPayloadRef.current) return;
    if (ringTimeoutTimerRef.current) clearTimeout(ringTimeoutTimerRef.current);

    setCallState('CONNECTING');

    try {
      // 1. Get Local Microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      } catch (micErr) {
        teardownCallResources();
        setCallError('Microphone access was denied. Please allow microphone permissions.');
        setCallState('FAILED');
        if (activeUserId && activeCall.targetUserId) {
          api.sendCallSignal(activeUserId, activeCall.targetUserId, 'declined', {});
        }
        return;
      }

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote audio stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (!remoteAudioRef.current) {
            const audio = new Audio();
            audio.autoplay = true;
            remoteAudioRef.current = audio;
          }
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Connection state change
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          setCallState('CONNECTED');
        } else if (state === 'failed' || state === 'disconnected') {
          teardownCallResources();
          setCallError('Voice connection lost. Please try again.');
          setCallState('FAILED');
          setTimeout(() => {
            setCallState('IDLE');
            setActiveCall(null);
          }, 4000);
        }
      };

      // Send ICE candidates to caller
      pc.onicecandidate = (event) => {
        if (event.candidate && activeUserId && activeCall.targetUserId) {
          api.sendCallSignal(activeUserId, activeCall.targetUserId, 'ice-candidate', event.candidate.toJSON());
        }
      };

      // 3. Set Remote Offer Description
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferPayloadRef.current));

      // 4. Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 5. Send Answer Signal
      if (activeUserId && activeCall.targetUserId) {
        const myName = currentProfile?.display_name || currentUser?.display_name || (caregiver ? caregiver.name : 'Leelu');
        await api.sendCallSignal(activeUserId, activeCall.targetUserId, 'answer', answer, activeCall.callId, myName);
      }

      setCallState('CONNECTED');
      setCallError(null);
    } catch (err: any) {
      console.error('[WebRTC] Error during acceptCall:', err);
      teardownCallResources();
      setCallError('Failed to establish audio connection.');
      setCallState('FAILED');
    }
  };

  // Action: Decline Incoming Call
  const declineCall = async () => {
    if (ringTimeoutTimerRef.current) clearTimeout(ringTimeoutTimerRef.current);
    if (activeUserId && activeCall?.targetUserId) {
      try {
        await api.sendCallSignal(activeUserId, activeCall.targetUserId, 'declined', {});
      } catch (e) {}
    }
    teardownCallResources();
    setCallState('IDLE');
    setActiveCall(null);
  };

  // Action: End Call
  const endCall = async () => {
    if (activeUserId && activeCall?.targetUserId) {
      try {
        await api.sendCallSignal(activeUserId, activeCall.targetUserId, 'hangup', {});
        await api.endCallSignal(activeUserId, activeCall.targetUserId, activeCall.callId);
      } catch (e) {}
    }
    teardownCallResources();
    setCallState('ENDED');
    setTimeout(() => {
      setCallState('IDLE');
      setActiveCall(null);
    }, 2000);
  };

  // Action: Mute / Unmute Local Microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !isMuted;
        audioTracks.forEach((t) => {
          t.enabled = !nextState;
        });
        setIsMuted(nextState);
      }
    }
  };

  // Action: Clear Error / Dismiss
  const clearCallState = () => {
    teardownCallResources();
    setCallState('IDLE');
    setActiveCall(null);
    setCallError(null);
  };

  return (
    <CallContext.Provider
      value={{
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
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
