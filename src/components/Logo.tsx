import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';

/** 炎の各パーツ（app iconと同じ形） */
const BODY =
  'M64 10 C74 32 88 44 88 68 C88 92 74 110 58 110 C41 110 29 95 29 77 C29 64 36 55 44 52 C42 63 51 67 52 58 C53 47 46 40 54 27 C57 22 61 16 64 10 Z';
const CORE =
  'M62 40 C69 55 78 63 76 80 C74 94 67 101 58 101 C48 101 43 91 43 79 C43 69 50 60 62 40 Z';
const PURPLE = 'M86 50 C99 63 99 86 85 99 C81 87 79 72 86 50 Z';

/**
 * アプリのロゴマーク（炎・SVGベクター）。app iconと同じ絵柄で、
 * オンボーディングや共有カードで“アプリの顔”として使う。
 */
export function Logo({ size = 120, glow = true }: { size?: number; glow?: boolean }) {
  const uid = useId().replace(/:/g, '');
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="-8 -6 136 136">
        <Defs>
          <LinearGradient id={`body${uid}`} x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor="#D9F94F" />
            <Stop offset="0.55" stopColor="#C6F432" />
            <Stop offset="1" stopColor="#FF9F43" />
          </LinearGradient>
          <LinearGradient id={`core${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F4FFC4" />
            <Stop offset="1" stopColor="#D9F94F" />
          </LinearGradient>
          <RadialGradient id={`glow${uid}`} cx="0.5" cy="0.62" r="0.55">
            <Stop offset="0" stopColor="#C6F432" stopOpacity="0.32" />
            <Stop offset="1" stopColor="#C6F432" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {glow && <Path d="M-8 -6 h136 v136 h-136 Z" fill={`url(#glow${uid})`} />}
        <G>
          <Path d={PURPLE} fill="#A78BFA" opacity={0.9} />
          <Path d={BODY} fill={`url(#body${uid})`} />
          <Path d={CORE} fill={`url(#core${uid})`} opacity={0.92} />
          <Circle cx={80} cy={30} r={3.2} fill="#D9F94F" />
          <Circle cx={34} cy={44} r={2.4} fill="#FF9F43" />
        </G>
      </Svg>
    </View>
  );
}
