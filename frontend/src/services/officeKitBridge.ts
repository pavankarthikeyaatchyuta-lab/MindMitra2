/**
 * MindMitra - Office Kit Real-Time Phone ↔ Laptop Bridge
 * Synchronizes approved on-device behavioral telemetry summaries from the iQOO phone
 * directly to the caregiver's Office Kit dashboard.
 *
 * Utilizes standard BroadcastChannel API for zero-latency local pairing,
 * backed by localStorage and persistent telemetry queue.
 */

export interface OfficeKitPacket {
  schemaVersion: '1.0';
  id: string;
  timestamp: string;
  deviceSource: 'iQOO Phone (On-Device Inference)' | 'MindMitra Phone Client';
  profile: {
    id: number;
    name: string;
  };
  session: {
    id: string;
    activityType: string;
    accuracy: number;
    latencyMs: number;
    completionTimeMs: number;
    corrections: number;
    repeatErrors: number;
  };
  baseline: {
    eligibleSessionCount: number;
    medianAccuracy: number;
    medianLatencyMs: number;
    medianCorrections: number;
    status: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION';
    statusLabel: string;
  };
  behavioralSignals: {
    firstInteractionLatencyMs: number;
    hesitationCount: number;
    repeatErrorRate: number;
    touchCount: number;
    meanHoldDurationMs?: number;
    voiceSequenceCompleteness?: number;
  };
  mlDecision: {
    model: string;
    decision: 'DECREASE' | 'MAINTAIN' | 'INCREASE';
    confidence: number;
    probabilities?: {
      DECREASE: number;
      MAINTAIN: number;
      INCREASE: number;
    };
    inferenceLatencyMs: number;
    onDevice: true;
  };
  deviation: {
    status: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION';
    isMeaningful: boolean;
    primarySignals: string[];
    reasonCodes: string[];
    trendDescription: string;
  };
  adaptation: {
    recommendedDifficulty: number;
    previousDifficulty: number;
    action: string;
    reason: string;
  };
  privacyMetadata: {
    rawAudioRetained: false;
    rawFramesRetained: false;
    clientSideInference: true;
    nonClinicalObservation: true;
  };

  // Top-level convenience / backward-compatibility mirrors:
  profileId: number;
  profileName: string;
  baselineAccuracy: number;
  sessionAccuracy: number;
  baselineLatencyMs: number;
  sessionLatencyMs: number;
  baselineCorrections: number;
  sessionCorrections: number;
  status: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION';
  primarySignals: string[];
  onDeviceML: {
    model: string;
    latencyMs: number;
    confidence: number;
    decision: string;
  };
}

const BROADCAST_CHANNEL_NAME = 'mindmitra_office_kit_channel';
const STORAGE_KEY = 'mindmitra_office_kit_latest_packet';
const HISTORY_KEY = 'mindmitra_office_kit_history';

export class OfficeKitBridge {
  private static channel: BroadcastChannel | null = null;

  private static getChannel(): BroadcastChannel | null {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (!this.channel) {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      }
      return this.channel;
    }
    return null;
  }


  /**
   * Validates and normalizes packet into explicit schemaVersion: "1.0" format.
   */
  public static normalizePacket(packet: any): OfficeKitPacket | null {
    if (!packet || typeof packet !== 'object' || !packet.id) return null;

    const profileId = packet.profile?.id ?? packet.profileId ?? 1;
    const profileName = packet.profile?.name ?? packet.profileName ?? 'Elderly Profile';
    const status = packet.deviation?.status ?? packet.status ?? 'NORMAL';

    const normalized: OfficeKitPacket = {
      schemaVersion: '1.0',
      id: String(packet.id),
      timestamp: packet.timestamp || new Date().toISOString(),
      deviceSource: packet.deviceSource || 'iQOO Phone (On-Device Inference)',
      profile: {
        id: Number(profileId),
        name: String(profileName),
      },
      session: {
        id: packet.session?.id || `sess_${Date.now()}`,
        activityType: packet.session?.activityType || 'PATTERN',
        accuracy: packet.session?.accuracy ?? packet.sessionAccuracy ?? 0.8,
        latencyMs: packet.session?.latencyMs ?? packet.sessionLatencyMs ?? 2000,
        completionTimeMs: packet.session?.completionTimeMs ?? 25000,
        corrections: packet.session?.corrections ?? packet.sessionCorrections ?? 0,
        repeatErrors: packet.session?.repeatErrors ?? 0,
      },
      baseline: {
        eligibleSessionCount: packet.baseline?.eligibleSessionCount ?? 5,
        medianAccuracy: packet.baseline?.medianAccuracy ?? packet.baselineAccuracy ?? 0.85,
        medianLatencyMs: packet.baseline?.medianLatencyMs ?? packet.baselineLatencyMs ?? 2100,
        medianCorrections: packet.baseline?.medianCorrections ?? packet.baselineCorrections ?? 1,
        status: packet.baseline?.status ?? status,
        statusLabel: packet.baseline?.statusLabel ?? (status === 'MEANINGFUL_DEVIATION' ? 'Meaningful Deviation' : 'Aligned with Personal Pattern'),
      },
      behavioralSignals: packet.behavioralSignals || {
        firstInteractionLatencyMs: packet.sessionLatencyMs || 2000,
        hesitationCount: 0,
        repeatErrorRate: 0,
        touchCount: 10,
      },
      mlDecision: packet.mlDecision || {
        model: packet.onDeviceML?.model || 'MindMitra-RF-Mobile (35 Trees)',
        decision: packet.onDeviceML?.decision || 'MAINTAIN',
        confidence: packet.onDeviceML?.confidence || 0.85,
        probabilities: packet.onDeviceML?.probabilities,
        inferenceLatencyMs: packet.onDeviceML?.latencyMs || 0.05,
        onDevice: true,
      },
      deviation: packet.deviation || {
        status,
        isMeaningful: status === 'MEANINGFUL_DEVIATION',
        primarySignals: packet.primarySignals || [],
        reasonCodes: packet.deviation?.reasonCodes || [],
        trendDescription: packet.deviation?.trendDescription || '',
      },
      adaptation: packet.adaptation || {
        recommendedDifficulty: 2,
        previousDifficulty: 2,
        action: 'Maintain current difficulty',
        reason: 'Performance matches personal baseline.',
      },
      privacyMetadata: {
        rawAudioRetained: false,
        rawFramesRetained: false,
        clientSideInference: true,
        nonClinicalObservation: true,
      },
      // Convenience aliases
      profileId: Number(profileId),
      profileName: String(profileName),
      baselineAccuracy: packet.baseline?.medianAccuracy ?? packet.baselineAccuracy ?? 0.85,
      sessionAccuracy: packet.session?.accuracy ?? packet.sessionAccuracy ?? 0.8,
      baselineLatencyMs: packet.baseline?.medianLatencyMs ?? packet.baselineLatencyMs ?? 2100,
      sessionLatencyMs: packet.session?.latencyMs ?? packet.sessionLatencyMs ?? 2000,
      baselineCorrections: packet.baseline?.medianCorrections ?? packet.baselineCorrections ?? 1,
      sessionCorrections: packet.session?.corrections ?? packet.sessionCorrections ?? 0,
      status,
      primarySignals: packet.deviation?.primarySignals || packet.primarySignals || [],
      onDeviceML: packet.onDeviceML || {
        model: 'MindMitra-RF-Mobile (35 Trees)',
        latencyMs: 0.05,
        confidence: 0.85,
        decision: 'MAINTAIN',
      },
    };

    return normalized;
  }

  /**
   * Phone Action: Broadcasts approved summary to laptop / Office Kit listener.
   * Sends locally (BroadcastChannel/localStorage) AND across network to backend.
   * Automatically queues packet for delivery if device is in airplane mode / offline.
   */
  public static publishSummary(rawPacket: any): void {
    const packet = this.normalizePacket(rawPacket);
    if (!packet) {
      console.warn('OfficeKitBridge: Dropped malformed packet without required id.');
      return;
    }

    try {
      // 1. Save to local storage for cross-page persistence
      localStorage.setItem(STORAGE_KEY, JSON.stringify(packet));

      // 2. Append to history (deduplicating if same ID already present)
      const history = this.getHistory();
      const filtered = history.filter(h => h.id !== packet.id);
      filtered.unshift(packet);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 20)));

      // 3. Broadcast real-time signal across local browser tabs
      const ch = this.getChannel();
      if (ch) {
        ch.postMessage({ type: 'OFFICE_KIT_UPDATE', packet });
      }

      // 4. Physical Cross-Device Transport: Publish to Backend API
      if (typeof fetch !== 'undefined') {
        fetch('/api/office-kit/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet),
        }).catch((err) => {
          // If offline / airplane mode, queue in local queue
          try {
            const queueKey = 'mindmitra_office_kit_queue';
            const queued = JSON.parse(localStorage.getItem(queueKey) || '[]');
            queued.push(packet);
            localStorage.setItem(queueKey, JSON.stringify(queued.slice(-10)));
          } catch {}
          console.log('Cross-device publish offline/queued:', err);
        });
      }
    } catch (e) {
      console.warn('Office Kit publish warning:', e);
    }
  }

  /**
   * Flushes queued packets once network connectivity returns.
   */
  public static flushOfflineQueue(): void {
    try {
      const queueKey = 'mindmitra_office_kit_queue';
      const queued = JSON.parse(localStorage.getItem(queueKey) || '[]');
      if (queued.length === 0) return;

      localStorage.removeItem(queueKey);
      queued.forEach((pkt: any) => {
        if (typeof fetch !== 'undefined') {
          fetch('/api/office-kit/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pkt),
          }).catch(() => {});
        }
      });
    } catch {}
  }


  /**
   * Laptop Action: Subscribes to real-time phone broadcasts across local tabs
   * AND across separate physical devices (via backend polling).
   */
  public static subscribe(onPacketReceived: (packet: OfficeKitPacket) => void): () => void {
    let lastPacketId: string | null = null;
    const initial = this.getLatestPacket();
    if (initial) lastPacketId = initial.id;

    // A. Local BroadcastChannel listener (for same browser / tabs)
    const ch = this.getChannel();
    const listener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OFFICE_KIT_UPDATE' && event.data.packet) {
        lastPacketId = event.data.packet.id;
        onPacketReceived(event.data.packet);
      }
    };
    if (ch) ch.addEventListener('message', listener);

    // B. Local Storage listener (for same machine cross-window)
    const storageListener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.id !== lastPacketId) {
            lastPacketId = parsed.id;
            onPacketReceived(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', storageListener);

    // C. Physical Cross-Device Transport: Poll backend for physical phone updates
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/office-kit/latest');
        if (res.ok) {
          const data = await res.json();
          if (data && data.packet && data.packet.id && data.packet.id !== lastPacketId) {
            lastPacketId = data.packet.id;
            // Update local cache
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.packet));
            onPacketReceived(data.packet);
          }
        }
      } catch {
        // Silent error if network disconnected
      }
    }, 1500);

    return () => {
      if (ch) ch.removeEventListener('message', listener);
      window.removeEventListener('storage', storageListener);
      clearInterval(pollInterval);
    };
  }

  /**
   * Retrieves the most recent packet.
   */
  public static getLatestPacket(): OfficeKitPacket | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves packet history.
   */
  public static getHistory(): OfficeKitPacket[] {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}
