/**
 * アプリ全体のデザイントークン（色・余白・フォント）。
 * ここを変えると全画面の見た目が変わる = デザインの一元管理。
 */

export const colors = {
  // 「継続 = 炎」をテーマにした温かみのある配色
  primary: '#F97316', // オレンジ（炎）
  primaryDark: '#EA580C',
  primaryLight: '#FDBA74',
  accent: '#EF4444', // 赤（達成の熱量）

  bg: '#FFF7ED', // 淡いオレンジの背景
  surface: '#FFFFFF',
  surfaceAlt: '#FFF1E6',

  text: '#1F2937',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',

  success: '#22C55E',
  successBg: '#DCFCE7',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  warning: '#F59E0B',

  border: '#F3E8DF',
  track: '#F1E4D8', // 進捗バーの下地
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const font = {
  hero: 40,
  title: 26,
  heading: 20,
  body: 16,
  sub: 14,
  small: 12,
} as const;

export const shadow = {
  card: {
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;
