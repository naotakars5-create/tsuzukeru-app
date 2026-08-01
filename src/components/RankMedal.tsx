import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { RankTier } from '@/types';
import { colors } from '@/theme';

/** hex色を係数で暗く（0.6=6割の明るさ） */
function darken(hex: string, k: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16
  );
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

// 尖り上の六角形の頂点（viewBox 100・中心50,50）
function hexPoints(r: number): string {
  const cx = 50;
  const cy = 50;
  const pts = [-90, -30, 30, 90, 150, 210].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return pts.join(' ');
}

const OUTER = hexPoints(46);
const INNER = hexPoints(34);

/**
 * ランク（称号）の勲章メダル（SVGベクター）。
 * 六角形プレート＋内側ディスク＋中央アイコンで“凝った”質感を出す。
 * locked のときはグレーで未解放を表現。
 */
export function RankMedal({
  rank,
  size = 96,
  locked = false,
}: {
  rank: RankTier;
  size?: number;
  locked?: boolean;
}) {
  const uid = `${rank.key}-${size}-${locked ? 'l' : 'u'}`;
  const plateA = locked ? '#2A323D' : rank.color;
  const plateB = locked ? '#1A202A' : darken(rank.color, 0.5);
  const engrave = locked ? colors.textMuted : darken(rank.color, 0.32);
  // 明るいプレートには濃色の紋章、ロック時はグレーに白系
  const iconColor = locked ? '#3D4652' : '#0B1220';
  const iconSize = Math.round(size * 0.36);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`plate-${uid}`} x1="0.15" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={plateA} />
            <Stop offset="1" stopColor={plateB} />
          </LinearGradient>
        </Defs>
        {/* 外周プレート（ソリッドな勲章） */}
        <Polygon
          points={OUTER}
          fill={`url(#plate-${uid})`}
          stroke="#FFFFFF"
          strokeOpacity={locked ? 0.06 : 0.35}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {/* 内側の刻印リング */}
        <Polygon
          points={INNER}
          fill="none"
          stroke={engrave}
          strokeOpacity={0.7}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* 上部のハイライト光沢 */}
        {!locked && <Circle cx={36} cy={26} r={7} fill="#FFFFFF" opacity={0.22} />}
      </Svg>
      {/* 中央の紋章アイコン（重ねる） */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Ionicons name={locked ? 'lock-closed' : rank.icon} size={iconSize} color={iconColor} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
