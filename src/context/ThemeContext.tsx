import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeId, ThemeOption } from '../types';
import { THEMES_LIST, DEFAULT_THEME_ID, getThemeById } from '../data/themes';
import { playSound } from '../utils/audio';

interface ThemeContextType {
  theme: ThemeId;
  currentThemeConfig: ThemeOption;
  availableThemes: ThemeOption[];
  isDark: boolean;
  setTheme: (themeId: ThemeId, playAudio?: boolean) => void;
  toggleTheme: () => void;
  cycleNextTheme: () => void;
  setRandomTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'ndc_alumni_theme_v2';
const LEGACY_STORAGE_KEY = 'ndc_alumni_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored === 'dark' || stored === 'midnight' || stored === 'cyber-neon' || stored === 'royal-prestige' || stored === 'crimson-pulse') {
        return 'dark';
      }
      if (stored === 'light' || stored === 'ndc-blue' || stored === 'ocean-teal' || stored === 'nordic-glacier' || stored === 'vintage-parchment') {
        return 'light';
      }

      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark';
      }
    } catch {
      // Fallback if localStorage or matchMedia is restricted
    }
    return DEFAULT_THEME_ID;
  });

  const currentThemeConfig = getThemeById(themeId);
  const isDark = currentThemeConfig.isDark;

  useEffect(() => {
    const root = document.documentElement;

    // Apply data-theme attribute
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Apply or remove dark class based on theme darkness
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Set CSS custom properties for instant dynamic highlights
    root.style.setProperty('--theme-color-primary', currentThemeConfig.colors.primary);
    root.style.setProperty('--theme-color-accent', currentThemeConfig.colors.accent);
    root.style.setProperty('--theme-color-bg', currentThemeConfig.colors.background);
    root.style.setProperty('--theme-color-surface', currentThemeConfig.colors.surface);
    root.style.setProperty('--theme-color-border', currentThemeConfig.colors.border);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
      localStorage.setItem(LEGACY_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // safe ignore
    }
  }, [themeId, isDark, currentThemeConfig]);

  const setTheme = (newThemeId: ThemeId, playAudio = true) => {
    const normalized: ThemeId = (newThemeId === 'dark' || newThemeId === 'midnight') ? 'dark' : 'light';
    if (normalized === themeId) return;
    setThemeId(normalized);
    if (playAudio) {
      playSound('theme');
    }
  };

  const toggleTheme = () => {
    setThemeId((prev) => (prev === 'dark' || prev === 'midnight' ? 'light' : 'dark'));
    playSound('theme');
  };

  const cycleNextTheme = () => {
    toggleTheme();
  };

  const setRandomTheme = () => {
    toggleTheme();
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: isDark ? 'dark' : 'light',
        currentThemeConfig,
        availableThemes: THEMES_LIST,
        isDark,
        setTheme,
        toggleTheme,
        cycleNextTheme,
        setRandomTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
