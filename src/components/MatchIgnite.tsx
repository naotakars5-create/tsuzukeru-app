import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * 点火演出用のマッチイラスト。
 * マッチ棒と火薬頭は静止したまま、先端の炎だけを外から渡された
 * Animated.Value（0→1）で灯す。炎はアイコンと同じシグネチャーフレイム形状。
 */
export function MatchIgnite({
  flameScale,
  size = 230,
}: {
  flameScale: Animated.Value;
  size?: number;
}) {
  // 基準キャンバス 220×240。size に合わせて全体をスケールする
  const s = size / 220;

  // 炎の下端をマッチ頭（138,110 付近）に固定したまま膨らませるため、
  // スケールと同時に沈み込みを打ち消す方向へ移動する
  const flameStyle = {
    opacity: flameScale.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: flameScale.interpolate({ inputRange: [0, 1], outputRange: [52 * s, 0] }) },
      { scale: flameScale },
    ],
  };

  return (
    <View style={{ width: 220 * s, height: 240 * s }}>
      {/* マッチ棒（静止） */}
      <Svg width={220 * s} height={240 * s} viewBox="0 0 220 240" style={StyleSheet.absoluteFill}>
        <Rect
          x={-7}
          y={-52}
          width={14}
          height={118}
          rx={6}
          fill={colors.textSub}
          transform="translate(104 172) rotate(31)"
        />
        <Ellipse cx={138} cy={112} rx={14} ry={16} fill={colors.orange} transform="rotate(31 138 112)" />
      </Svg>

      {/* 炎（Animated で点火） */}
      <Animated.View style={[styles.flame, { left: 78 * s, top: 6 * s, width: 120 * s, height: 122 * s }, flameStyle]}>
        <Svg width={120 * s} height={122 * s} viewBox="0 0 120 122">
          <Defs>
            <LinearGradient id="matchFlame" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.ember} />
              <Stop offset="0.55" stopColor={colors.primary} />
              <Stop offset="1" stopColor={colors.magma} />
            </LinearGradient>
          </Defs>
          <Path
            fill="url(#matchFlame)"
            d="M60 16 C72 32 86 46 86 66 A26 26 0 0 1 34 66 C34 51 45 43 49 29 C53 39 58 41 60 35 C62 29 59 22 60 16 Z"
          />
          <Path
            fill={colors.bg}
            d="M60 58 C67 66 73 70 73 79 A13 13 0 0 1 47 79 C47 71 54 67 56 59 C58 64 59 62 60 58 Z"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flame: { position: 'absolute' },
});
