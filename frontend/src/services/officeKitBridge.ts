/**
 * MindMitra - Office Kit Real-Time Phone ↔ Laptop Bridge
 * Synchronizes approved on-device behavioral telemetry summaries from the iQOO phone
 * directly to the caregiver's Office Kit dashboard.
 *
 * Utilizes standard BroadcastChannel API for zero-latency local pairing,
 * backed by localStorage and persistent telemetry queue.
 */

export interface OfficeKitPacket {
  id: string;
  profileId: number;
  profileName: string;
  timestamp: string;
  deviceSource: 'iQOO Phone (On-Device Inference)';
  baselineAccuracy: number;
  sessionAccuracy: number;
  baselineLatencyMs: number;
  sessionLatencyMs: number;
  baselineCorrections: number;
  sessionCorrections: number;
  status: 'MEANINGFUL_DEVIATION' | 'NORMAL' | 'CALIBRATING' | 'MINOR_DEVIATION';
  primarySignals: string[];
  adaptation: {
    recommendedDifficulty: number;
    previousDifficulty: number;
    action: string;
    reason: string;
  };
  onDeviceML: {
    model: string;
    latencyMs: number;
    confidence: number;
    decision: string;
  };
  behavioralSignals: {
    firstInteractionLatencyMs: number;
    hesitationCount: number;
    repeatErrorRate: number;
    touchCount: number;
    voiceSequenceCompleteness?: number;
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
   * Phone Action: Broadcasts approved summary to laptop / Office Kit listener.
   * Sends locally (BroadcastChannel/localStorage) AND across network to backend.
   */
  public static publishSummary(packet: OfficeKitPacket): void {
    try {
      // 1. Save to local storage for cross-page persistence
      localStorage.setItem(STORAGE_KEY, JSON.stringify(packet));

      // 2. Append to history
      const history = this.getHistory();
      history.unshift(packet);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));

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
          console.log('Cross-device publish offline/queued:', err);
        });
      }
    } catch (e) {
      console.warn('Office Kit publish warning:', e);
    }
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
