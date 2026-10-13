import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Settings, CardBackTheme } from '../types';
import { DEFAULT_SETTINGS, CARD_BACK_THEMES } from '../constants';

const SETTINGS_KEY = 'solitaire-settings';

interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle missing keys from older versions
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyCardBackTheme(theme: CardBackTheme) {
  const colors = CARD_BACK_THEMES[theme];
  const root = document.documentElement.style;
  root.setProperty('--card-back-color1', colors.color1);
  root.setProperty('--card-back-color2', colors.color2);
  root.setProperty('--card-back-border', colors.border);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  // Apply card back theme on mount and when it changes
  useEffect(() => {
    applyCardBackTheme(settings.cardBackTheme);
  }, [settings.cardBackTheme]);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

// The hook lives next to its provider; fast refresh still works for the provider component.
// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
