import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import Svg, { Path, Ellipse, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { colors } from '@/theme';

/** マスコットの表情 */
export type MascotMood = 'idle' | 'happy' | 'celebrate' | 'worried' | 'sleep';

const DARK = '#0B1220'; // 顔パーツ（目・口）の色

/**
 * 「ヒノコ」— アプリの顔になる炎のマスコット（SVGベクター）。
 * 表情を mood で切り替え、ゆらゆらと呼吸する idle アニメを持つ。
 * ラスター画像を使わないので軽く、全画面で絵柄が完全に統一される。
 */
export function FlameMascot({
  size = 120,
  mood = 'idle',
  animated = true,
}: {
  size?: number;
  mood?: MascotMood;
  animated?: boolean;
}) {
  const w = size * (100 / 120);
  const h = size;

  // SVGグラデーションのidをインスタンスごとにユニークに（Webでのid衝突を防ぐ）
  const uid = useId().replace(/:/g, '');
  const bodyId = `flameBody-${uid}`;
  const coreId = `flameCore-${uid}`;

  // ゆらゆら呼吸（上下＋わずかに伸縮）
  const breathe = useRef(new Animated.Value(0)).current;
  // 炎のゆらぎ（外側オーラの明滅）
  const flicker = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const f = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    b.start();
    f.start();
    return () => {
      b.stop();
      f.stop();
    };
  }, [animated, breathe, flicker]);

  const translateY = breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const scaleY = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const auraOpacity = flicker.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] });
  const auraScale = flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
      {/* 発光オーラ（背後でゆらぐ） */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.center,
          { opacity: auraOpacity, transform: [{ scale: auraScale }] },
        ]}
        pointerEvents="none"
      >
        <Svg width={w} height={h} viewBox="0 0 100 120">
          <Path d={FLAME_BODY} fill={colors.primary} />
        </Svg>
      </Animated.View>

      {/* 本体 */}
      <Animated.View style={{ transform: [{ translateY }, { scaleY }] }}>
        <Svg width={w} height={h} viewBox="0 0 100 120">
          <Defs>
            <LinearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.ember} />
              <Stop offset="0.55" stopColor={colors.primary} />
              <Stop offset="1" stopColor={colors.magma} />
            </LinearGradient>
            <LinearGradient id={coreId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F4FFC4" />
              <Stop offset="1" stopColor={colors.ember} />
            </LinearGradient>
          </Defs>

          {/* 炎の輪郭 */}
          <Path d={FLAME_BODY} fill={`url(#${bodyId})`} />
          {/* 内側の明るいコア */}
          <Path d={FLAME_CORE} fill={`url(#${coreId})`} opacity={0.9} />

          {/* 顔 */}
          <Face mood={mood} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** 表情パーツ */
function Face({ mood }: { mood: MascotMood }) {
  const cheeks = (
    <G opacity={0.55}>
      <Circle cx={31} cy={80} r={4} fill={colors.orange} />
      <Circle cx={69} cy={80} r={4} fill={colors.orange} />
    </G>
  );

  // 目
  let eyes: React.ReactNode;
  if (mood === 'celebrate') {
    // ^ ^（うれしい閉じ目）
    eyes = (
      <G stroke={DARK} strokeWidth={3} strokeLinecap="round" fill="none">
        <Path d="M33 68 Q40 61 47 68" />
        <Path d="M53 68 Q60 61 67 68" />
      </G>
    );
  } else if (mood === 'sleep') {
    // 半月の閉じ目
    eyes = (
      <G stroke={DARK} strokeWidth={2.6} strokeLinecap="round" fill="none">
        <Path d="M34 70 Q40 74 46 70" />
        <Path d="M54 70 Q60 74 66 70" />
      </G>
    );
  } else {
    // まん丸の目（idle / happy / worried）＋ハイライト
    eyes = (
      <G>
        <Ellipse cx={40} cy={70} rx={5} ry={6.2} fill={DARK} />
        <Ellipse cx={60} cy={70} rx={5} ry={6.2} fill={DARK} />
        <Circle cx={42} cy={67.5} r={1.7} fill="#FFFFFF" />
        <Circle cx={62} cy={67.5} r={1.7} fill="#FFFFFF" />
      </G>
    );
  }

  // 口
  let mouth: React.ReactNode;
  if (mood === 'celebrate') {
    mouth = <Path d="M42 80 Q50 92 58 80 Z" fill={DARK} />;
  } else if (mood === 'happy') {
    mouth = (
      <Path d="M41 82 Q50 91 59 82" stroke={DARK} strokeWidth={3} strokeLinecap="round" fill="none" />
    );
  } else if (mood === 'worried') {
    mouth = (
      <Path d="M44 87 Q50 81 56 87" stroke={DARK} strokeWidth={2.8} strokeLinecap="round" fill="none" />
    );
  } else if (mood === 'sleep') {
    mouth = <Ellipse cx={50} cy={84} rx={3} ry={3.6} fill={DARK} opacity={0.85} />;
  } else {
    // idle
    mouth = (
      <Path d="M45 83 Q50 87 55 83" stroke={DARK} strokeWidth={2.8} strokeLinecap="round" fill="none" />
    );
  }

  // 心配そうな眉
  const brows =
    mood === 'worried' ? (
      <G stroke={DARK} strokeWidth={2.4} strokeLinecap="round" fill="none">
        <Path d="M34 60 L45 63" />
        <Path d="M66 60 L55 63" />
      </G>
    ) : null;

  return (
    <G>
      {cheeks}
      {eyes}
      {brows}
      {mouth}
    </G>
  );
}

// 炎の輪郭（先が尖り、下がふっくら丸い雫型）
const FLAME_BODY =
  'M50 4 C62 28 88 46 84 78 C82 100 68 114 50 114 C32 114 18 100 16 78 C12 46 38 28 50 4 Z';
// 内側の明るいコア
const FLAME_CORE =
  'M50 30 C58 46 72 58 68 80 C66 96 59 104 50 104 C41 104 34 96 32 80 C28 58 42 46 50 30 Z';

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
