import { create } from 'zustand';
import { slateTokens } from '@oyemcore/shared';

export type ThemeType = 'light' | 'dark';

export interface ThemeColors {
  // Arka planlar
  background: string;
  card: string;
  surfaceRaised: string;
  headerBg: string;
  // Metin
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnDark: string;
  // Marka
  primary: string;
  primaryLight: string;
  primaryDark: string;
  brandPrimary: string;
  brandAccent: string;
  brandAccentLt: string;
  brandGold: string;
  brandGoldLt: string;
  brandPurple: string;
  // Eski uyumluluk
  accent: string;
  accentLight: string;
  info: string;
  infoLight: string;
  // Kenarlık
  border: string;
  borderOnDark: string;
  // Durum
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  success: string;
  successLight: string;
  // Pastel Renkler
  pastelBlueBg: string;
  pastelBlueIcon: string;
  pastelOrangeBg: string;
  pastelOrangeIcon: string;
  pastelGreenBg: string;
  pastelGreenIcon: string;
  pastelPurpleBg: string;
  pastelPurpleIcon: string;
  // Input
  inputBg: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;
  // Navbar
  navbarBg: string;
  navbarTint: string;
  statusBar: 'dark' | 'light';
  shadowColor: string;
  // Badge
  badgeLowBg: string;
  badgeLowText: string;
  // Yardımcı
  goldBg15: string;
  goldBorder35: string;
  primaryAlpha15: string;
  primaryAlpha08: string;
}

export const themes: Record<ThemeType, ThemeColors> = {
  light: {
    // Arka planlar
    background:      slateTokens.bgPage,
    card:            slateTokens.surface,
    surfaceRaised:   slateTokens.surfaceRaised,
    headerBg:        slateTokens.brandPrimary,

    // Metin
    text:            slateTokens.textBody,
    textSecondary:   slateTokens.textSecondary,
    textMuted:       slateTokens.textMuted,
    textOnDark:      slateTokens.textOnDark,

    // Marka
    primary:         slateTokens.brandPrimary,
    primaryLight:    slateTokens.brandPrimaryLt,
    primaryDark:     slateTokens.brandPrimaryDk,
    brandPrimary:    slateTokens.brandPrimary,
    brandAccent:     slateTokens.brandAccent,
    brandAccentLt:   slateTokens.brandAccentLt,
    brandGold:       slateTokens.brandGold,
    brandGoldLt:     slateTokens.brandGoldLt,
    brandPurple:     slateTokens.brandPurple,

    // Eski uyumluluk
    accent:          slateTokens.brandPrimary,
    accentLight:     slateTokens.brandPrimaryLt,
    info:            slateTokens.brandAccent,
    infoLight:       slateTokens.brandAccentLt,

    // Kenarlık
    border:          slateTokens.border,
    borderOnDark:    slateTokens.borderOnDark,

    // Durum
    danger:          slateTokens.danger,
    dangerLight:     slateTokens.dangerLt,
    warning:         slateTokens.warning,
    warningLight:    slateTokens.warningLt,
    success:         slateTokens.success,
    successLight:    slateTokens.successLt,

    // Pastel Renkler
    pastelBlueBg:    slateTokens.pastelBlueBg,
    pastelBlueIcon:  slateTokens.pastelBlueIcon,
    pastelOrangeBg:  slateTokens.pastelOrangeBg,
    pastelOrangeIcon:slateTokens.pastelOrangeIcon,
    pastelGreenBg:   slateTokens.pastelGreenBg,
    pastelGreenIcon: slateTokens.pastelGreenIcon,
    pastelPurpleBg:  slateTokens.pastelPurpleBg,
    pastelPurpleIcon:slateTokens.pastelPurpleIcon,

    // Input
    inputBg:         slateTokens.surface,
    inputBorder:     '#D1D5DB',
    inputText:       slateTokens.textBody,
    placeholder:     slateTokens.textMuted,

    // Navbar
    navbarBg:        slateTokens.surface,
    navbarTint:      slateTokens.brandPrimary,
    statusBar:       'light',
    shadowColor:     '#000000',

    // Badge
    badgeLowBg:      slateTokens.border,
    badgeLowText:    '#6B7280',

    // Yardımcı
    goldBg15:        slateTokens.goldBg15,
    goldBorder35:    slateTokens.goldBorder35,
    primaryAlpha15:  slateTokens.primaryAlpha15,
    primaryAlpha08:  slateTokens.primaryAlpha08,
  },

  dark: {
    background:      '#0F0E17',
    card:            '#1A1928',
    surfaceRaised:   '#1E1B4B',
    headerBg:        '#1E1B4B',

    text:            '#F9FAFB',
    textSecondary:   '#9CA3AF',
    textMuted:       '#6B7280',
    textOnDark:      '#FFFFFF',

    primary:         '#60A5FA',
    primaryLight:    'rgba(96,165,250,0.15)',
    primaryDark:     '#2563EB',
    brandPrimary:    '#60A5FA',
    brandAccent:     '#FB923C',
    brandAccentLt:   'rgba(251,146,60,0.15)',
    brandGold:       '#FCD34D',
    brandGoldLt:     'rgba(252,211,77,0.15)',
    brandPurple:     '#818CF8',

    accent:          '#60A5FA',
    accentLight:     'rgba(96,165,250,0.15)',
    info:            '#FB923C',
    infoLight:       'rgba(251,146,60,0.12)',

    border:          '#312E81',
    borderOnDark:    'rgba(255,255,255,0.08)',

    danger:          '#F87171',
    dangerLight:     'rgba(248,113,113,0.12)',
    warning:         '#FCD34D',
    warningLight:    'rgba(252,211,77,0.12)',
    success:         '#34D399',
    successLight:    'rgba(52,211,153,0.12)',

    // Pastel Renkler (Dark mode için uyarlanmış koyu zeminler)
    pastelBlueBg:    'rgba(59,130,246,0.15)',
    pastelBlueIcon:  '#60A5FA',
    pastelOrangeBg:  'rgba(249,115,22,0.15)',
    pastelOrangeIcon:'#FB923C',
    pastelGreenBg:   'rgba(34,197,94,0.15)',
    pastelGreenIcon: '#4ADE80',
    pastelPurpleBg:  'rgba(168,85,247,0.15)',
    pastelPurpleIcon:'#C084FC',

    inputBg:         '#1A1928',
    inputBorder:     '#312E81',
    inputText:       '#F9FAFB',
    placeholder:     '#6B7280',

    navbarBg:        '#1A1928',
    navbarTint:      '#60A5FA',
    statusBar:       'light',
    shadowColor:     '#000000',

    badgeLowBg:      '#312E81',
    badgeLowText:    '#A5B4FC',

    goldBg15:        'rgba(252,211,77,0.15)',
    goldBorder35:    'rgba(252,211,77,0.35)',
    primaryAlpha15:  'rgba(96,165,250,0.15)',
    primaryAlpha08:  'rgba(96,165,250,0.08)',
  },
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
    return { theme: nextTheme, colors: themes[nextTheme] };
  }),
  setTheme: (theme: ThemeType) => set({ theme, colors: themes[theme] }),
}));
