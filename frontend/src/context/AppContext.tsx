import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Caregiver, Session, GameType } from '../types';
import { api } from '../services/api';
import { clearAllCaches } from '../services/storage';

export interface AuthResult {
  success: boolean;
  error?: string;
  status?: number;
}

interface AppContextType {
  caregiver: Caregiver | null;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  currentProfile: User | null;
  setCurrentProfile: (user: User | null) => void;
  switchProfile: (user: User | null) => void;
  currentSession: Session | null;
  setCurrentSession: (session: Session | null) => void;
  isOnline: boolean;
  currentDifficulty: Record<GameType, number>;
  setGameDifficulty: (gameType: GameType, difficulty: number) => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
}

const defaultDifficulty: Record<GameType, number> = {
  memory_match: 1,
  daily_routine: 1,
  object_recognition: 1,
  pattern_recall: 1,
};

const AppContext = createContext<AppContextType>({
  caregiver: null,
  currentUser: null,
  setCurrentUser: () => {},
  currentProfile: null,
  setCurrentProfile: () => {},
  switchProfile: () => {},
  currentSession: null,
  setCurrentSession: () => {},
  isOnline: true,
  currentDifficulty: defaultDifficulty,
  setGameDifficulty: () => {},
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(() => {
    const saved = localStorage.getItem('mindmitra_caregiver');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mindmitra_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [currentDifficulty, setCurrentDifficulty] = useState<Record<GameType, number>>(defaultDifficulty);

  // Validate session on mount if token exists
  useEffect(() => {
    async function validateAuth() {
      const token = localStorage.getItem('mindmitra_token');
      if (token) {
        try {
          const res = await api.getMe(token);
          if (res && res.caregiver) {
            setCaregiver(res.caregiver);
            localStorage.setItem('mindmitra_caregiver', JSON.stringify(res.caregiver));

            // Auto-select active profile if none is currently selected
            const savedUser = localStorage.getItem('mindmitra_current_user');
            if (!savedUser || !currentUser) {
              try {
                const profs = await api.getProfiles();
                if (profs && profs.length > 0) {
                  switchProfile(profs[0]);
                }
              } catch {}
            }
          }
        } catch (err: any) {
          if (err?.status === 401) {
            logout();
          }
        }
      }
    }
    validateAuth();
  }, []);

  const switchProfile = (profile: User | null) => {
    setCurrentSession(null);
    setCurrentDifficulty(defaultDifficulty);
    setCurrentUser(profile);
    if (profile) {
      localStorage.setItem('mindmitra_current_user', JSON.stringify(profile));
      if (profile.preferred_language) {
        localStorage.setItem('mindmitra_lang', profile.preferred_language);
      }
    } else {
      localStorage.removeItem('mindmitra_current_user');
    }
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const res = await api.login({ email: cleanEmail, password });
      if (res && res.token) {
        clearAllCaches();
        localStorage.setItem('mindmitra_token', res.token);
        localStorage.setItem('mindmitra_caregiver', JSON.stringify(res.caregiver));
        setCaregiver(res.caregiver);

        // Auto-select first profile for seamless presence
        try {
          const profs = await api.getProfiles();
          if (profs && profs.length > 0) {
            switchProfile(profs[0]);
          } else {
            setCurrentUser(null);
          }
        } catch {
          setCurrentUser(null);
        }

        return { success: true };
      }
      return { success: false, error: 'Invalid response from backend server.' };
    } catch (err: any) {
      const status = err?.status;
      let msg = 'Email or password is incorrect.';
      if (status === 401) {
        msg = 'Email or password is incorrect.';
      } else if (status === 400) {
        msg = err?.detail || 'Invalid login details.';
      } else if (status === 403) {
        msg = 'Access denied to this caregiver account.';
      } else if (status === 500) {
        msg = 'Something went wrong on the server. Please try again.';
      } else if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError') || !isOnline) {
        msg = 'Unable to connect to MindMitra. Check your connection and try again.';
      } else if (err?.detail) {
        msg = err.detail;
      }
      return { success: false, error: msg, status };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<AuthResult> => {
    try {
      const cleanName = name.trim();
      const cleanEmail = email.toLowerCase().trim();
      const res = await api.register({ name: cleanName, email: cleanEmail, password });
      if (res && res.token) {
        clearAllCaches();
        localStorage.setItem('mindmitra_token', res.token);
        localStorage.setItem('mindmitra_caregiver', JSON.stringify(res.caregiver));
        setCaregiver(res.caregiver);
        setCurrentUser(null);
        return { success: true };
      }
      return { success: false, error: 'Registration failed. Invalid server response.' };
    } catch (err: any) {
      const status = err?.status;
      let msg = 'Registration failed. Please try again.';
      if (status === 409) {
        msg = 'An account with this email already exists.';
      } else if (status === 400) {
        msg = err?.detail || 'Invalid registration details.';
      } else if (status === 500) {
        msg = 'Something went wrong on the server. Please try again.';
      } else if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError') || !isOnline) {
        msg = 'Unable to connect to MindMitra. Check your connection and try again.';
      } else if (err?.detail) {
        msg = err.detail;
      }
      return { success: false, error: msg, status };
    }
  };

  const logout = () => {
    try {
      api.logout();
    } catch {}
    localStorage.removeItem('mindmitra_token');
    localStorage.removeItem('mindmitra_caregiver');
    localStorage.removeItem('mindmitra_current_user');
    localStorage.removeItem('mindmitra_completed_games');
    localStorage.removeItem('mindmitra_session_id');
    clearAllCaches();
    sessionStorage.clear();
    setCaregiver(null);
    setCurrentUser(null);
    setCurrentSession(null);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setGameDifficulty = (gameType: GameType, difficulty: number) => {
    setCurrentDifficulty(prev => ({ ...prev, [gameType]: difficulty }));
  };

  return (
    <AppContext.Provider value={{
      caregiver,
      currentUser,
      setCurrentUser: switchProfile,
      currentProfile: currentUser,
      setCurrentProfile: switchProfile,
      switchProfile,
      currentSession,
      setCurrentSession,
      isOnline,
      currentDifficulty,
      setGameDifficulty,
      login,
      register,
      logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
export const useAppContext = useApp;
