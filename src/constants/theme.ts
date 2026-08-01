/**
 * HomeRecipe brand tokens — ported from web app/globals.css (light only).
 */

export const Colors = {
  background: '#ffffff',
  backgroundMuted: '#f7f9f7',
  backgroundPanel: '#fbfbfc',
  foreground: '#171717',
  foregroundMuted: '#4a4a4a',
  accent: '#dc2100',
  accentHover: '#a01800',
  accentMuted: 'rgba(220, 33, 0, 0.2)',
  accentMutedBg: 'rgba(220, 33, 0, 0.06)',
  accentSoftFill: 'rgba(220, 33, 0, 0.09)',
  gray100: '#f5f5f5',
  gray200: '#ebebeb',
  gray300: '#e0e0e0',
  gray400: '#d4d4d4',
  gray500: '#ababab',
  gray600: '#737373',
  gray700: '#666666',
  gray800: '#404342',
  gray900: '#333333',
  gray950: '#1a1a1a',
  successBg: '#e8f2e8',
  successFg: '#519451',
  warningBg: '#fdf6e4',
  warningFg: '#d9a112',
  errorBg: '#f7dbd7',
  errorFg: '#ba3523',
  brandBlue: '#33658a',
  brandLime: '#95c623',
  brandLimeFg: '#4a6a12',
  border: '#e8ecf3',
  white: '#ffffff',
  overlay: 'rgba(0,0,0,0.45)',
  upcomingBg: '#f7faf3',
  iconChipBg: '#ffe7dc',
} as const;

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 96,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 50,
} as const;

export const FontFamily = {
  body: 'CreatoDisplay',
  bodyMedium: 'CreatoDisplay-Medium',
  bodyBold: 'CreatoDisplay-Bold',
  display: 'PlayfairDisplay_700Bold',
  displayRegular: 'PlayfairDisplay_400Regular',
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 40,
} as const;

export const HitTarget = {
  min: 44,
} as const;

export const IconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const FabSize = 56;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  dock: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
