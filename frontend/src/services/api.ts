import { saveOfflineEvent, getOfflineEvents, clearOfflineEvents, saveToCache, getFromCache, isOnline } from './storage';
import { PersonalMemoryDB, StoredProfile } from './personalMemoryDB';
import { User, Session, GameSession, GameEvent, AdaptiveMetrics, AdaptiveResult, AdaptiveDecision, Baseline, TrendData, CognitiveDomain, Insight, Reminder, FamiliarPerson, CommunitySession, TrustedConnection, MemoryStory, ThreeDomainOverview } from '../types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options: RequestInit = {}, cacheKey?: string): Promise<T> {
  if (!isOnline()) {
    if (cacheKey) {
      const cached = getFromCache(cacheKey);
      if (cached) return cached as T;
    }
    throw new Error('Offline and no cache available');
  }

  try {
    const token = localStorage.getItem('mindmitra_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch {
        errorDetail = response.statusText;
      }

      if (response.status === 401) {
        localStorage.removeItem('mindmitra_token');
        localStorage.removeItem('mindmitra_caregiver');
      }

      const err: any = new Error(errorDetail || `HTTP Error ${response.status}`);
      err.status = response.status;
      err.url = url;
      err.detail = errorDetail;
      throw err;
    }
    const data = await response.json();
    if (cacheKey) saveToCache(cacheKey, data);
    return data;
  } catch (err) {
    if (cacheKey) {
      const cached = getFromCache(cacheKey);
      if (cached) return cached as T;
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    fetchJSON<{ token: string; caregiver: { id: number; name: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  register: (data: { name: string; email: string; password: string }) =>
    fetchJSON<{ token: string; caregiver: { id: number; name: string; email: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: (token?: string) =>
    fetchJSON<{ caregiver: { id: number; name: string; email: string }; profiles: User[] }>('/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  logout: () => fetchJSON<{ status: string }>('/auth/logout', { method: 'POST' }),

  // Profiles Lifecycle
  getProfiles: async (includeArchived: boolean = false): Promise<User[]> => {
    try {
      if (isOnline()) {
        const fetched = await fetchJSON<User[]>(`/profiles?include_archived=${includeArchived}`, {}, 'profiles');
        if (fetched && fetched.length > 0) {
          fetched.forEach(p => {
            PersonalMemoryDB.saveProfile({
              id: p.id,
              name: p.name || p.display_name || 'Individual',
              display_name: p.display_name || p.name || 'Individual',
              age: p.age,
              relationship: p.relationship,
              created_at: p.created_at || new Date().toISOString()
            });
          });
          return fetched;
        }
      }
    } catch {}
    const local = await PersonalMemoryDB.getProfiles();
    return local as unknown as User[];
  },
  getArchivedProfiles: () => fetchJSON<User[]>('/profiles/archived', {}, 'profiles_archived'),
  createProfile: async (profile: { name: string; age: number; preferred_language: string; voice_enabled: boolean }) => {
    const localId = Date.now();
    const newProfile: User = {
      id: localId,
      name: profile.name,
      display_name: profile.name,
      age: profile.age,
      preferred_language: profile.preferred_language || 'te',
      voice_enabled: profile.voice_enabled ?? true,
      caregiver_id: 1,
      is_archived: false,
      created_at: new Date().toISOString()
    };
    await PersonalMemoryDB.saveProfile({
      id: newProfile.id,
      name: newProfile.name || 'Individual',
      display_name: newProfile.display_name,
      age: newProfile.age,
      preferred_language: newProfile.preferred_language,
      voice_enabled: newProfile.voice_enabled,
      created_at: newProfile.created_at
    });
    if (!isOnline()) return newProfile;
    try {
      return await fetchJSON<User>('/profiles', { method: 'POST', body: JSON.stringify(profile) });
    } catch {
      return newProfile;
    }
  },
  getProfile: async (id: number): Promise<User> => {
    const profiles = await PersonalMemoryDB.getProfiles();
    const found = profiles.find((p: StoredProfile) => p.id === id);
    if (found) return found as unknown as User;
    return fetchJSON<User>(`/profiles/${id}`, {}, `profile_${id}`);
  },
  updateProfile: async (id: number, profile: { name?: string; age?: number; preferred_language?: string; voice_enabled?: boolean }): Promise<User> => {
    let localUpdated: StoredProfile | null = null;
    try {
      localUpdated = await PersonalMemoryDB.updateProfile(id, profile);
      const savedUserStr = localStorage.getItem('mindmitra_current_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser.id === id) {
          const merged = { ...savedUser, ...profile };
          localStorage.setItem('mindmitra_current_user', JSON.stringify(merged));
        }
      }
      if (profile.preferred_language) {
        localStorage.setItem('mindmitra_lang', profile.preferred_language);
      }
    } catch (e) {
      console.warn('PersonalMemoryDB updateProfile notice:', e);
    }

    if (!isOnline()) {
      return (localUpdated as unknown as User) || ({ id, ...profile } as User);
    }
    try {
      return await fetchJSON<User>(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(profile) });
    } catch {
      return (localUpdated as unknown as User) || ({ id, ...profile } as User);
    }
  },
  archiveProfile: (id: number) => fetchJSON<{ status: string; id: number }>(`/profiles/${id}/archive`, { method: 'POST' }),
  restoreProfile: (id: number) => fetchJSON<{ status: string; id: number }>(`/profiles/${id}/restore`, { method: 'POST' }),
  deleteProfile: (id: number) => fetchJSON<{ status: string; id: number }>(`/profiles/${id}`, { method: 'DELETE' }),
  deleteProfilePermanently: (id: number) => fetchJSON<{ status: string; id: number }>(`/profiles/${id}`, { method: 'DELETE' }),
  exportProfileData: (id: number) => fetchJSON<any>(`/profiles/${id}/export`),
  changePassword: (data: { current_password: string; new_password: string }) =>
    fetchJSON<{ status: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Users (Legacy Alias)
  getUsers: () => api.getProfiles(false),
  createUser: (user: Partial<User>) => fetchJSON<{ id: number }>('/users', { method: 'POST', body: JSON.stringify(user) }),
  getUser: (id: number) => api.getProfile(id),
  seedDemoUsers: () => fetchJSON<any>('/users/demo', { method: 'POST' }),

  // Sessions
  startSession: async (userId: number): Promise<{ id: number }> => {
    const fallbackId = Date.now();
    if (!isOnline()) return { id: fallbackId };
    try {
      return await fetchJSON<{ id: number }>('/sessions/start', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
    } catch {
      return { id: fallbackId };
    }
  },
  completeSession: (sessionId: number) => {
    if (!isOnline()) return Promise.resolve({ status: 'completed_offline' });
    return fetchJSON<any>(`/sessions/${sessionId}/complete`, { method: 'POST' });
  },
  getUserSessions: (userId: number) => fetchJSON<Session[]>(`/sessions/user/${userId}`, {}, `sessions_${userId}`),
  getCanonicalSessionCount: (userId: number) => fetchJSON<{ user_id: number; session_count: number; game_session_count: number }>(`/sessions/canonical-count/${userId}`),
  getSessionDetails: (sessionId: number) => fetchJSON<any>(`/sessions/${sessionId}`, {}, `session_${sessionId}`),

  // Game Sessions
  startGameSession: async (dataOrSessionId: any, userId?: number, gameType?: string, difficulty?: number): Promise<{ id: number }> => {
    const fallbackId = Date.now();
    if (!isOnline()) return { id: fallbackId };
    try {
      const payload = typeof dataOrSessionId === 'object'
        ? dataOrSessionId
        : { session_id: dataOrSessionId, user_id: userId, game_type: gameType, difficulty: difficulty };
      return await fetchJSON<{ id: number }>('/games/session/start', { method: 'POST', body: JSON.stringify(payload) });
    } catch {
      return { id: fallbackId };
    }
  },
  completeGameSession: async (id: number, metrics: any) => {
    // Record to local behavioral memory DB
    let uid = metrics.user_id || metrics.userId;
    if (!uid) {
      try {
        const savedUserStr = localStorage.getItem('mindmitra_current_user');
        if (savedUserStr) {
          const savedUser = JSON.parse(savedUserStr);
          uid = savedUser.id;
        }
      } catch {}
    }
    if (!uid) uid = 1;
    const sessionPayload = {
      userId: uid,
      domain: metrics.game_type || 'overall',
      accuracy: metrics.accuracy ?? 0.8,
      mean_response_time_ms: metrics.avg_response_time_ms ?? 2000,
      corrections: metrics.corrections ?? 0,
      repeat_errors: metrics.repeat_errors ?? 0,
      completion_time_ms: metrics.completion_time_ms ?? 25000,
      difficulty: metrics.difficulty ?? 2,
      timestamp: new Date().toISOString()
    };
    PersonalMemoryDB.recordSession(sessionPayload);
    if (sessionPayload.domain !== 'overall') {
      PersonalMemoryDB.recordSession({
        ...sessionPayload,
        domain: 'overall'
      });
    }

    if (!isOnline()) {
      saveOfflineEvent({ type: 'complete_game_session', id, data: metrics });
      return Promise.resolve({ status: 'saved_offline' });
    }
    try {
      return await fetchJSON<any>(`/games/session/${id}/complete`, { method: 'POST', body: JSON.stringify(metrics) });
    } catch {
      saveOfflineEvent({ type: 'complete_game_session', id, data: metrics });
      return Promise.resolve({ status: 'saved_offline' });
    }
  },
  getUserGameSessions: (userId: number) => fetchJSON<GameSession[]>(`/games/sessions/user/${userId}`, {}, `game_sessions_${userId}`),
  getUserGameSessionsByType: (userId: number, gameType: string) => fetchJSON<GameSession[]>(`/games/sessions/user/${userId}/${gameType}`, {}, `game_sessions_${userId}_${gameType}`),

  // Game Events
  recordGameEvent: (event: GameEvent) => {
    if (!isOnline()) {
      saveOfflineEvent({ type: 'game_event', data: event });
      return Promise.resolve({ id: Date.now() });
    }
    return fetchJSON<any>('/games/event', { method: 'POST', body: JSON.stringify(event) });
  },

  // Adaptive
  getAdaptiveRecommendation: (userId: number, gameType: string, metrics: AdaptiveMetrics) =>
    fetchJSON<AdaptiveResult>('/adaptive/recommend', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, game_type: gameType, current_metrics: metrics }),
    }),
  getAdaptiveHistory: (userId: number) => fetchJSON<AdaptiveDecision[]>(`/adaptive/history/${userId}`, {}, `adaptive_${userId}`),

  // Familiar People (Caregiver Managed with Offline Persistence)
  getFamiliarPeople: async (userId: number): Promise<FamiliarPerson[]> => {
    const storageKey = `mindmitra_familiar_${userId}`;
    const localSaved = localStorage.getItem(storageKey);
    let localList: FamiliarPerson[] = localSaved ? JSON.parse(localSaved) : [];

    if (isOnline()) {
      try {
        const fetched = await fetchJSON<FamiliarPerson[]>(`/familiar-people/${userId}`, {}, `familiar_${userId}`);
        if (fetched && fetched.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(fetched));
          return fetched;
        }
      } catch (err) {
        console.warn('Network getFamiliarPeople fallback to local:', err);
      }
    }

    if (localList.length > 0) {
      return localList;
    }

    // Default seeded fallbacks ONLY for demo profiles (Rajesh: 1, Sunita: 2)
    if (userId === 1) {
      const defaults: FamiliarPerson[] = [
        { id: 101, user_id: 1, name: 'Anita Kumar', relationship: 'Daughter', photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', consent_confirmed: true },
        { id: 102, user_id: 1, name: 'Ramesh Kumar', relationship: 'Son', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', consent_confirmed: true },
        { id: 103, user_id: 1, name: 'Lakshmi Devi', relationship: 'Wife', photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', consent_confirmed: true },
        { id: 104, user_id: 1, name: 'Vikram Kumar', relationship: 'Grandson', photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', consent_confirmed: true },
      ];
      localStorage.setItem(storageKey, JSON.stringify(defaults));
      return defaults;
    } else if (userId === 2) {
      const defaults: FamiliarPerson[] = [
        { id: 201, user_id: 2, name: 'Meera Sharma', relationship: 'Daughter', photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', consent_confirmed: true },
        { id: 202, user_id: 2, name: 'Arun Sharma', relationship: 'Son', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', consent_confirmed: true },
        { id: 203, user_id: 2, name: 'Pooja Sharma', relationship: 'Granddaughter', photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', consent_confirmed: true },
      ];
      localStorage.setItem(storageKey, JSON.stringify(defaults));
      return defaults;
    }
    return [];
  },
  addFamiliarPerson: async (person: { user_id: number; name: string; relationship: string; photo_url: string; consent_confirmed: boolean }) => {
    const newId = Date.now();
    const newRecord: FamiliarPerson = { id: newId, ...person };
    const storageKey = `mindmitra_familiar_${person.user_id}`;
    const existing: FamiliarPerson[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.push(newRecord);
    localStorage.setItem(storageKey, JSON.stringify(existing));

    if (!isOnline()) {
      return { id: newId, status: 'saved_offline' };
    }
    try {
      return await fetchJSON<{ id: number; status: string }>('/familiar-people', { method: 'POST', body: JSON.stringify(person) });
    } catch {
      return { id: newId, status: 'saved_offline' };
    }
  },
  updateFamiliarPerson: async (id: number, person: { name: string; relationship: string; photo_url: string; consent_confirmed: boolean }) => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mindmitra_familiar_')) {
        const list: FamiliarPerson[] = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = list.findIndex(p => p.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...person };
          localStorage.setItem(key, JSON.stringify(list));
          break;
        }
      }
    }
    if (!isOnline()) return { status: 'saved_offline' };
    try {
      return await fetchJSON<any>(`/familiar-people/${id}`, { method: 'PUT', body: JSON.stringify(person) });
    } catch {
      return { status: 'saved_offline' };
    }
  },
  deleteFamiliarPerson: async (id: number) => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mindmitra_familiar_')) {
        const list: FamiliarPerson[] = JSON.parse(localStorage.getItem(key) || '[]');
        const filtered = list.filter(p => p.id !== id);
        if (filtered.length !== list.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
          break;
        }
      }
    }
    if (!isOnline()) return { status: 'saved_offline' };
    try {
      return await fetchJSON<any>(`/familiar-people/${id}`, { method: 'DELETE' });
    } catch {
      return { status: 'saved_offline' };
    }
  },

  // Analytics
  getBaseline: (userId: number, gameType: string) => fetchJSON<Baseline>(`/analytics/baseline/${userId}/${gameType}`, {}, `baseline_${userId}_${gameType}`),
  getTrends: (userId: number) => fetchJSON<TrendData[]>(`/analytics/trends/${userId}`, {}, `trends_${userId}`),
  getOverallTrend: (userId: number) => fetchJSON<any>(`/analytics/overall-trend/${userId}`, {}, `overall_trend_${userId}`),
  getCognitiveDomains: (userId: number) => fetchJSON<CognitiveDomain[]>(`/analytics/cognitive-domains/${userId}`, {}, `domains_${userId}`),
  getSessionSummary: (sessionId: number) => fetchJSON<any>(`/analytics/session-summary/${sessionId}`, {}, `summary_${sessionId}`),

  // Explainability
  explainInsight: (domain: string, status: string, evidence: string) =>
    fetchJSON<{ explanation: string; provider?: string; tier?: number; disclaimer?: string }>('/explain/insight', {
      method: 'POST',
      body: JSON.stringify({ domain, status, evidence }),
    }),
  getAllInsights: (userId: number) => fetchJSON<Insight[]>(`/explain/insights/${userId}`, {}, `insights_${userId}`),

  // Reminders
  getReminders: (userId: number) => fetchJSON<Reminder[]>(`/reminders/${userId}`, {}, `reminders_${userId}`),
  createReminder: (reminder: Reminder) => fetchJSON<{ id: number }>('/reminders', { method: 'POST', body: JSON.stringify(reminder) }),
  updateReminder: (id: number, reminder: Reminder) => fetchJSON<any>(`/reminders/${id}`, { method: 'PUT', body: JSON.stringify(reminder) }),
  deleteReminder: (id: number) => fetchJSON<any>(`/reminders/${id}`, { method: 'DELETE' }),

  // Sync
  getSyncStatus: () => {
    if (!isOnline()) {
      return Promise.resolve({ unsynced_items: getOfflineEvents().length, online: false });
    }
    return fetchJSON<any>('/sync/status').then(data => ({ ...data, online: true }));
  },
  simulateSync: async () => {
    if (!isOnline()) return { status: 'offline' };
    const events = getOfflineEvents();
    for (const event of events) {
      try {
        if (event.type === 'game_event') await api.recordGameEvent(event.data);
        if (event.type === 'complete_game_session') await api.completeGameSession(event.id, event.data);
      } catch {}
    }
    clearOfflineEvents();
    await fetchJSON<any>('/sync/simulate', { method: 'POST' });
    return { status: 'synced', count: events.length };
  },

  // Community Mode
  startCommunitySession: (name: string, activityType: string, profileIds: number[], notes?: string, forceNew?: boolean) =>
    fetchJSON<CommunitySession & { reused?: boolean }>('/community/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ name, activity_type: activityType, profile_ids: profileIds, notes, force_new: !!forceNew }),
    }),
  completeCommunitySession: (id: number, durationMinutes?: number, notes?: string, participantNotes?: Record<string, string>) =>
    fetchJSON<{ status: string; id: number }>(`/community/sessions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ duration_minutes: durationMinutes, notes, participant_notes: participantNotes }),
    }),
  abandonCommunitySession: (id: number) =>
    fetchJSON<{ status: string; id: number }>(`/community/sessions/${id}/abandon`, {
      method: 'POST',
    }),
  getCaregiverCommunitySessions: (caregiverId: number) =>
    fetchJSON<CommunitySession[]>(`/community/sessions/caregiver/${caregiverId}`, {}, `community_caregiver_${caregiverId}`),
  getProfileCommunitySessions: (profileId: number) =>
    fetchJSON<CommunitySession[]>(`/community/sessions/profile/${profileId}`, {}, `community_profile_${profileId}`),
  recordCommunityEvent: (event: { community_session_id: number; profile_id?: number; activity_key: string; event_type: string; data?: any }) =>
    fetchJSON<any>('/community/events', { method: 'POST', body: JSON.stringify(event) }),

  // Connect Mode & Trusted Connections
  getProfileConnections: (profileId: number) =>
    fetchJSON<TrustedConnection[]>(`/connections/profile/${profileId}`, {}, `connections_${profileId}`),
  addTrustedConnection: (conn: {
    profile_id: number;
    contact_name?: string;
    display_name?: string;
    contact_type?: 'mindmitra_user' | 'external';
    relationship: string;
    caregiver_name?: string;
    target_user_id?: number;
    contact_user_id?: number;
    phone_number?: string;
    phone_or_address?: string;
    status?: string;
  }) =>
    fetchJSON<{ id: number; status: string; display_name: string; contact_type: string; target_user_id?: number }>('/connections', { method: 'POST', body: JSON.stringify(conn) }),
  deleteTrustedConnection: (id: number) =>
    fetchJSON<{ status: string; id: number }>(`/connections/${id}`, { method: 'DELETE' }),

  // WebRTC Audio Call Signaling & Presence (Database-Backed)
  sendPresenceHeartbeat: (userId: number, sessionId?: string) =>
    fetchJSON<{ status: string; user_id: number; timestamp: string }>('/presence/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, session_id: sessionId })
    }),
  sendCallSignal: (caller_profile_id: number, target_user_id: number, signal_type: string, payload?: any, call_id?: string, caller_name?: string) =>
    fetchJSON<{ status: string; signal_type: string; target_user_id: number }>('/call/signal', {
      method: 'POST',
      body: JSON.stringify({ caller_profile_id, target_user_id, recipient_profile_id: target_user_id, signal_type, payload, call_id, caller_name })
    }),
  pollCallSignals: (targetUserId: number) =>
    fetchJSON<{
      signals: Array<{
        id: number;
        call_id: string;
        caller_profile_id: number;
        caller_name?: string;
        caller_relationship?: string;
        target_user_id: number;
        recipient_profile_id: number;
        signal_type: string;
        payload?: any;
        timestamp: string;
      }>;
      target_user_id: number;
    }>(`/call/signals/${targetUserId}`),
  getCallPresence: (targetId: number) =>
    fetchJSON<{ target_id: number; online: boolean; last_seen?: string }>(`/call/presence/${targetId}`),
  endCallSignal: (caller_profile_id: number, target_user_id: number, call_id?: string) =>
    fetchJSON<{ status: string; call_id: string }>('/call/end', {
      method: 'POST',
      body: JSON.stringify({ caller_profile_id, target_user_id, recipient_profile_id: target_user_id, call_id, signal_type: 'hangup' })
    }),

  // Memory Stories
  getProfileStories: (profileId: number) =>
    fetchJSON<MemoryStory[]>(`/stories/profile/${profileId}`, {}, `stories_${profileId}`),
  createMemoryStory: (story: { profile_id: number; title: string; audio_url?: string; transcript_text?: string; category?: string; is_private?: boolean }) =>
    fetchJSON<{ id: number; title: string }>('/stories', { method: 'POST', body: JSON.stringify(story) }),

  // 3-Domain Overview
  get3DomainOverview: (userId: number) =>
    fetchJSON<ThreeDomainOverview>(`/analytics/domains-overview/${userId}`, {}, `overview_3domain_${userId}`),

  // Demo
  seedFullDemo: () => fetchJSON<any>('/demo/seed', { method: 'POST' }),
};

// Named exports for convenience (import * as api)
export const getUsers = api.getUsers;
export const createUser = api.createUser;
export const getUser = api.getUser;
export const seedDemoUsers = api.seedDemoUsers;
export const startSession = api.startSession;
export const completeSession = api.completeSession;
export const getUserSessions = api.getUserSessions;
export const getSessionDetails = api.getSessionDetails;
export const startGameSession = api.startGameSession;
export const completeGameSession = api.completeGameSession;
export const getUserGameSessions = api.getUserGameSessions;
export const getUserGameSessionsByType = api.getUserGameSessionsByType;
export const recordGameEvent = api.recordGameEvent;
export const getAdaptiveRecommendation = api.getAdaptiveRecommendation;
export const getAdaptiveHistory = api.getAdaptiveHistory;
export const getFamiliarPeople = api.getFamiliarPeople;
export const addFamiliarPerson = api.addFamiliarPerson;
export const updateFamiliarPerson = api.updateFamiliarPerson;
export const deleteFamiliarPerson = api.deleteFamiliarPerson;
export const getBaseline = api.getBaseline;
export const getTrends = api.getTrends;
export const getCognitiveDomains = api.getCognitiveDomains;
export const getSessionSummary = api.getSessionSummary;
export const explainInsight = api.explainInsight;
export const getAllInsights = api.getAllInsights;
export const getReminders = api.getReminders;
export const createReminder = api.createReminder;
export const updateReminder = api.updateReminder;
export const deleteReminder = api.deleteReminder;
export const getSyncStatus = api.getSyncStatus;
export const simulateSync = api.simulateSync;
export const seedFullDemo = api.seedFullDemo;

