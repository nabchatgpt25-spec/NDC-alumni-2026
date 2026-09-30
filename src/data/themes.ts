import { ThemeId, ThemeOption } from '../types';

export const THEMES_LIST: ThemeOption[] = [
  {
    id: 'light',
    name: 'Light Mode',
    tagline: 'Clean Notre Dame College Blue, Gold Sunlight & Crisp White',
    isDark: false,
    category: 'light',
    colors: {
      primary: '#1d4ed8',
      accent: '#d97706',
      background: '#f8fafc',
      surface: '#ffffff',
      border: '#e2e8f0',
      textPreview: '#0f172a',
    },
    palette: ['#1d4ed8', '#3b82f6', '#d97706', '#f8fafc'],
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    tagline: 'Deep Slate Midnight with high-contrast electric blue accents',
    isDark: true,
    category: 'dark',
    colors: {
      primary: '#3b82f6',
      accent: '#60a5fa',
      background: '#0b1120',
      surface: '#0f172a',
      border: '#1e293b',
      textPreview: '#f8fafc',
    },
    palette: ['#3b82f6', '#60a5fa', '#0f172a', '#0b1120'],
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'light';

export function getThemeById(id: string | null | undefined): ThemeOption {
  if (id === 'dark' || id === 'midnight' || id === 'cyber-neon' || id === 'royal-prestige' || id === 'crimson-pulse') {
    return THEMES_LIST[1]; // Dark Mode
  }
  return THEMES_LIST[0]; // Light Mode
}
