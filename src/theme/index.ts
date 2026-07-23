/**
 * アプリ全体のデザイントークン（色・余白・フォント）。
 * テイスト: モダンフィットネス系「ダーク × ネオンライム」。
 * 深いチャコール背景に、ライムのアクセント（ボタンは黒文字のライムピル）、
 * データはオレンジ/パープルの色付きチップで彩る。
 * ここを変えると全画面の見た目が変わる = デザインの一元管理。
 */

export const colors = {
  // アクセント（ネオンライム）
  primary: '#C6F432', // メインのライム
  ember: '#D9F94F', // 明るいライム（グラデ端）
  flame: '#C6F432', // アクティブ要素の塗り（=primary）
  magma: '#9CCB1D', // 深いライム（グラデ端）
  /** ライムの上に載せる文字（黒に近い色） */
  onAccent: '#0C0F14',

  // データ用のサブカラー（画像のチップ配色）
  orange: '#FF9F43',
  purple: '#A78BFA',

  // 背景・面
  bg: '#0A0D12', // 深いチャコール
  surface: '#141920', // カード
  surfaceAlt: '#1C232C', // 一段明るい面
  border: '#242C36',

  // テキスト
  text: '#F4F6F8',
  textSub: '#8C97A5',
  textMuted: '#5A6472',

  // 意味的な色
  success: '#4ADE80',
  successBg: '#12271B',
  danger: '#FF6B6B',
  dangerBg: '#2A1A1D',
  warning: '#FFC24B',

  /** 暗いカードの上に載せる文字（白系） */
  onFlame: '#F4F6F8',
} as const;

/** ライムのグラデーション（LinearGradient用の配色） */
export const gradients = {
  flame: ['#D9F94F', '#C6F432', '#9CCB1D'] as const,
  flameSoft: ['#D9F94F', '#B7E62E'] as const,
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
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    shadowColor: '#C6F432',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;
