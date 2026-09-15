import { api } from '../services/api';
import { GameSession, GameType, AdaptiveMetrics } from '../types';

export const useTelemetry = () => {
  const recordEvent = async (gameSessionId: number, userId: number, eventType: string, eventData: any = {}) => {
    try {
      await api.recordGameEvent({
        game_session_id: gameSessionId,
        user_id: userId,
        event_type: eventType,
        event_data: eventData
      });
    } catch (e) {
      console.error('Failed to record event:', e);
    }
  };

  const startGameSession = async (sessionId: number, userId: number, gameType: GameType, difficulty: number): Promise<number> => {
    try {
      const session = await api.startGameSession({
        session_id: sessionId,
        user_id: userId,
        game_type: gameType,
        difficulty,
      });
      return session.id;
    } catch (e) {
      console.error('Failed to start game session:', e);
      return Date.now(); // Fallback ID for offline
    }
  };

  const completeGameSession = async (id: number, metrics: Partial<GameSession>) => {
    try {
      await api.completeGameSession(id, {
        ...metrics,
      });
    } catch (e) {
      console.error('Failed to complete game session:', e);
    }
  };

  const getAdaptiveRecommendation = async (userId: number, gameType: GameType, metrics: AdaptiveMetrics) => {
    try {
      return await api.getAdaptiveRecommendation(userId, gameType, metrics);
    } catch (e) {
      console.error('Failed to get recommendation:', e);
      return null;
    }
  };

  return {
    recordEvent,
    startGameSession,
    completeGameSession,
    getAdaptiveRecommendation
  };
};
