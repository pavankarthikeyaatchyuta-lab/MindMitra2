/**
 * MindMitra - Offline-First Personal Behavioral Memory Data Layer
 * Backed by browser IndexedDB with automatic transactional safety and in-memory/localStorage fallback.
 * 
 * Works 100% offline with zero cloud or backend dependency.
 * Stores:
 * - Profiles (individual identity)
 * - Sessions (raw evidence vectors)
 * - Baselines (longitudinal calculated patterns)
 * - Deviations (detected behavioral shifts)
 * - Adaptations (experience adjustment records)
 */

export interface StoredProfile {
  id: number;
  name: string;
  display_name?: string;
  age?: number;
  relationship?: string;
  is_demo?: boolean;
  created_at: string;
}

export interface StoredSessionEvidence {
  id?: string;
  userId: number;
  domain: string; // 'memory', 'routine', 'visual', 'overall'
  accuracy: number;
  mean_response_time_ms: number;
  corrections: number;
  repeat_errors: number;
  completion_time_ms: number;
  difficulty: number;
  timestamp: string;
  telemetryDetails?: {
    firstInteractionLatencyMs?: number;
    responseTimeVariance?: number;
    hesitationCount?: number;
    totalTaps?: number;
  };
}

export interface StoredBaseline {
  userId: number;
  domain: string;
  eligibleSessionCount: number;
  baselineMedianAccuracy: number;
  baselineMedianLatencyMs: number;
  baselineMedianCorrections: number;
  baselineMedianCompletionTimeMs: number;
  baselineStdDev: number;
  status: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION';
  statusLabel: string;
  trendDescription: string;
  reasonCodes: string[];
  lastUpdated: string;
}

export interface StoredAdaptation {
  id?: string;
  userId: number;
  gameType: string;
  previousDifficulty: number;
  recommendedDifficulty: number;
  recommendation: 'DECREASE' | 'MAINTAIN' | 'INCREASE';
  reason: string;
  timestamp: string;
}

const DB_NAME = 'mindmitra_personal_memory';
const DB_VERSION = 1;

export class PersonalMemoryDB {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB not supported in this environment'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (evt: IDBVersionChangeEvent) => {
        const db = (evt.target as IDBOpenDBRequest).result;

        // 1. Profiles Store
        if (!db.objectStoreNames.contains('profiles')) {
          const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
          profileStore.createIndex('name', 'name', { unique: false });
        }

        // 2. Sessions Store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
          sessionStore.createIndex('userId', 'userId', { unique: false });
          sessionStore.createIndex('userDomain', ['userId', 'domain'], { unique: false });
          sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 3. Baselines Store
        if (!db.objectStoreNames.contains('baselines')) {
          db.createObjectStore('baselines', { keyPath: ['userId', 'domain'] });
        }

        // 4. Adaptations Store
        if (!db.objectStoreNames.contains('adaptations')) {
          const adaptStore = db.createObjectStore('adaptations', { keyPath: 'id', autoIncrement: true });
          adaptStore.createIndex('userId', 'userId', { unique: false });
          adaptStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      req.onsuccess = () => {
        resolve(req.result);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });

    return this.dbPromise;
  }

  // --- PROFILES ---

  public static async getProfiles(): Promise<StoredProfile[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('profiles', 'readonly');
        const store = tx.objectStore('profiles');
        const req = store.getAll();
        req.onsuccess = () => {
          if (req.result && req.result.length > 0) {
            resolve(req.result);
          } else {
            // Seed default profiles if completely empty
            const defaults = this.getDefaultProfiles();
            this.seedProfiles(defaults).then(() => resolve(defaults));
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage
      const saved = localStorage.getItem('mindmitra_offline_profiles');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return this.getDefaultProfiles();
    }
  }

  public static async saveProfile(profile: StoredProfile): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('profiles', 'readwrite');
        const store = tx.objectStore('profiles');
        const req = store.put(profile);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const current = await this.getProfiles();
      const idx = current.findIndex(p => p.id === profile.id);
      if (idx >= 0) current[idx] = profile;
      else current.push(profile);
      localStorage.setItem('mindmitra_offline_profiles', JSON.stringify(current));
    }
  }

  private static getDefaultProfiles(): StoredProfile[] {
    return [
      {
        id: 1,
        name: 'Rajesh Kumar',
        display_name: 'Rajesh Kumar',
        age: 72,
        relationship: 'Father',
        is_demo: true,
        created_at: '2026-09-01T08:00:00Z',
      },
      {
        id: 2,
        name: 'Sunita Devi',
        display_name: 'Sunita Devi',
        age: 68,
        relationship: 'Mother',
        is_demo: true,
        created_at: '2026-09-01T08:00:00Z',
      },
    ];
  }

  private static async seedProfiles(profiles: StoredProfile[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('profiles', 'readwrite');
      const store = tx.objectStore('profiles');
      for (const p of profiles) {
        store.put(p);
      }
    } catch {}
  }

  // --- SESSIONS (BEHAVIORAL EVIDENCE) ---

  public static async recordSession(session: StoredSessionEvidence): Promise<void> {
    const enrichedSession = {
      ...session,
      id: session.id || 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      timestamp: session.timestamp || new Date().toISOString(),
    };

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('sessions', 'readwrite');
        const store = tx.objectStore('sessions');
        const req = store.put(enrichedSession);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback
      const key = 'mindmitra_profile_history_' + session.userId + '_' + session.domain;
      const saved = localStorage.getItem(key);
      const list = saved ? JSON.parse(saved) : [];
      list.push(enrichedSession);
      localStorage.setItem(key, JSON.stringify(list.slice(-50)));
    }
  }

  public static async getSessionHistory(userId: number, domain: string = 'overall'): Promise<StoredSessionEvidence[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readonly');
        const store = tx.objectStore('sessions');
        const index = store.index('userId');
        const req = index.getAll(IDBKeyRange.only(userId));

        req.onsuccess = () => {
          const allUserSessions: StoredSessionEvidence[] = req.result || [];
          const filtered = domain === 'overall'
            ? allUserSessions
            : allUserSessions.filter(s => s.domain === domain);
          filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          resolve(filtered);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      const key = 'mindmitra_profile_history_' + userId + '_' + domain;
      const saved = localStorage.getItem(key);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return [];
    }
  }

  // --- BASELINES ---

  public static async getBaseline(userId: number, domain: string = 'overall'): Promise<StoredBaseline | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('baselines', 'readonly');
        const store = tx.objectStore('baselines');
        const req = store.get([userId, domain]);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      const key = 'mindmitra_baseline_' + userId + '_' + domain;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    }
  }

  public static async saveBaseline(baseline: StoredBaseline): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('baselines', 'readwrite');
        const store = tx.objectStore('baselines');
        const req = store.put(baseline);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const key = 'mindmitra_baseline_' + baseline.userId + '_' + baseline.domain;
      localStorage.setItem(key, JSON.stringify(baseline));
    }
  }

  // --- ADAPTATIONS ---

  public static async recordAdaptation(adaptation: StoredAdaptation): Promise<void> {
    const record = {
      ...adaptation,
      id: adaptation.id || 'adapt_' + Date.now(),
      timestamp: adaptation.timestamp || new Date().toISOString(),
    };

    try {
      const db = await this.getDB();
      const tx = db.transaction('adaptations', 'readwrite');
      tx.objectStore('adaptations').put(record);
    } catch {
      const key = 'mindmitra_adaptations_' + adaptation.userId;
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push(record);
      localStorage.setItem(key, JSON.stringify(list.slice(-30)));
    }
  }

  public static async getAdaptationHistory(userId: number): Promise<StoredAdaptation[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('adaptations', 'readonly');
        const store = tx.objectStore('adaptations');
        const index = store.index('userId');
        const req = index.getAll(IDBKeyRange.only(userId));
        req.onsuccess = () => {
          const list: StoredAdaptation[] = req.result || [];
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      const key = 'mindmitra_adaptations_' + userId;
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
  }
}
