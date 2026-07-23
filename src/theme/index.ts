/**
 * アプリ全体のデザイントークン（色・余白・フォント）。
 * デザイン案B「情熱（Bold）」— 力強いダーク基調＋炎のグラデーション。
 * ここを変えると全画面の見た目が変わる = デザインの一元管理。
 */

export const colors = {
  // 炎のアクセント（グラデーションの端点）
  primary: '#FF8A4C', // アイコン・強調テキスト用の明るい炎色
  ember: '#FF7A2F', // グラデ開始
  flame: '#F0472E', // グラデ中間
  magma: '#C4265E', // グラデ終端（ピンク寄り）

  // 背景・面
  bg: '#0E1015', // ほぼ黒
  surface: '#181B22', // カード
  surfaceAlt: '#1F232B', // 一段明るい面
  border: '#23272F',

  // テキスト
  text: '#F3F4F7',
  textSub: '#8B93A4',
  textMuted: '#5B6270',

  // 意味的な色
  success: '#31D07F',
  successBg: '#12251B',
  danger: '#FF7A6B',
  dangerBg: '#2B1F24',
  warning: '#FFC24B',

  onFlame: '#FFFFFF', // グラデ上に載せる文字
} as const;

/** 炎のグラデーション（LinearGradient用の配色） */
export const gradients = {
  flame: ['#FF7A2F', '#F0472E', '#C4265E'] as const,
  flameSoft: ['#FF7A2F', '#F0472E'] as const,
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
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

export const font = {
  hero: 52,
  title: 26,
  heading: 20,
  body: 16,
  sub: 14,
  small: 12,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    shadowColor: '#F0472E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
