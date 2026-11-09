import { create } from 'zustand';

interface SettingsState {
  timeFormat: '12h' | '24h';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: 'dark' | 'amoled';

  setTimeFormat: (format: '12h' | '24h') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'dark' | 'amoled') => void;
}

const STORAGE_KEY = 'routine_planner_settings';

const loadSavedSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse settings from storage', e);
  }
  return {
    timeFormat: '12h',
    notificationsEnabled: true,
    soundEnabled: true,
    theme: 'dark',
  };
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...loadSavedSettings(),

  setTimeFormat: (timeFormat) => {
    set({ timeFormat });
    const current = loadSavedSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, timeFormat }));
  },

  setNotificationsEnabled: (notificationsEnabled) => {
    set({ notificationsEnabled });
    const current = loadSavedSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, notificationsEnabled }));
  },

  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
    const current = loadSavedSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, soundEnabled }));
  },

  setTheme: (theme) => {
    set({ theme });
    const current = loadSavedSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, theme }));
  },
}));

