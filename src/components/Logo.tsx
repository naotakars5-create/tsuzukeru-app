import React, { useId } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

/**
 * アプリのロゴマーク。アプリアイコン（assets/icon.png）と同じ絵柄を
 * 背景透過で切り出した logo-mark.png を表示するので、ホーム画面のアイコンと
 * オンボーディング/ログイン画面の見た目が完全に一致する。
 * 絵柄の内側の黒い線はそのまま透過なので、暗い背景の上で自然に馴染む。
 */
export function Logo({ size = 120, glow = true }: { size?: number; glow?: boolean }) {
  const uid = useId().replace(/:/g, '');
  return (
    <View style={{ width: size, height: size }}>
      {glow && (
        <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`glow${uid}`} cx="0.5" cy="0.62" r="0.55">
              <Stop offset="0" stopColor="#C6F432" stopOpacity="0.28" />
              <Stop offset="1" stopColor="#C6F432" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Path d="M0 0 h100 v100 h-100 Z" fill={`url(#glow${uid})`} />
        </Svg>
      )}
      <Image
        source={require('../../assets/logo-mark.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="覚悟の勉強"
      />
    </View>
  );
}
