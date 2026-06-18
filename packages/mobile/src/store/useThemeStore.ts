import { create } from 'zustand';

export type ThemeType = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;
  navbarBg: string;
  navbarTint: string;
  statusBar: 'dark' | 'light';
  shadowColor: string;
}

export const themes: Record<ThemeType, ThemeColors> = {
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    primary: '#0f9d58',
    primaryLight: '#e6f4ea',
    accent: '#009ef7',
    accentLight: '#e1f5fe',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    info: '#3b82f6',
    infoLight: '#eff6ff',
    inputBg: '#ffffff',
    inputBorder: '#cbd5e1',
    inputText: '#334155',
    placeholder: '#94a3b8',
    navbarBg: '#ffffff',
    navbarTint: '#0f172a',
    statusBar: 'dark',
    shadowColor: '#000000',
  },
  dark: {
    background: '#0c0c14',
    card: '#151521',
    text: '#ffffff',
    textSecondary: '#a1a5b7',
    border: '#2a2a3c',
    primary: '#10b981',
    primaryLight: 'rgba(16, 185, 129, 0.12)',
    accent: '#009ef7',
    accentLight: 'rgba(0, 158, 247, 0.12)',
    danger: '#f1416c',
    dangerLight: 'rgba(241, 65, 108, 0.12)',
    warning: '#ffc700',
    warningLight: 'rgba(255, 199, 0, 0.12)',
    info: '#7239ea',
    infoLight: 'rgba(114, 57, 234, 0.12)',
    inputBg: '#1b1b29',
    inputBorder: '#2a2a3c',
    inputText: '#ffffff',
    placeholder: '#565674',
    navbarBg: '#151521',
    navbarTint: '#ffffff',
    statusBar: 'light',
    shadowColor: '#000000',
  }
};

interface ThemeState {
  theme: ThemeType;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  colors: themes.light,
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    return {
      theme: nextTheme,
      colors: themes[nextTheme]
    };
  }),
  setTheme: (theme: ThemeType) => set({
    theme,
    colors: themes[theme]
  })
}));
