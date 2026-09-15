export const saveOfflineEvent = (event: any) => {
  const events = getOfflineEvents();
  events.push({ ...event, timestamp: new Date().toISOString() });
  localStorage.setItem('mindmitra_offline_events', JSON.stringify(events));
};

export const getOfflineEvents = (): any[] => {
  const events = localStorage.getItem('mindmitra_offline_events');
  return events ? JSON.parse(events) : [];
};

export const clearOfflineEvents = () => {
  localStorage.removeItem('mindmitra_offline_events');
};

export const saveToCache = (key: string, data: any) => {
  localStorage.setItem(`mindmitra_cache_${key}`, JSON.stringify(data));
};

export const getFromCache = (key: string): any | null => {
  const data = localStorage.getItem(`mindmitra_cache_${key}`);
  return data ? JSON.parse(data) : null;
};

export const isOnline = () => {
  return navigator.onLine;
};

export const clearAllCaches = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('mindmitra_cache_') || key.startsWith('mindmitra_current_user') || key.startsWith('mindmitra_session_id') || key.startsWith('mindmitra_completed_games'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
};
