import React from 'react';
import { Image, ImageStyle, StyleProp, View, ViewStyle, StyleSheet } from 'react-native';

/**
 * ブランドアート（生成イラスト）の一元管理。
 * 画面からは <Art name="book" size={120} /> のように名前で呼ぶ。
 * ここに足せば全画面から使えるようになる。
 */
const ART = {
  book: require('../../assets/art-book.png'),
  books: require('../../assets/art-books.png'),
  hourglass: require('../../assets/art-hourglass.png'),
  candle: require('../../assets/art-candle.png'),
  summit: require('../../assets/art-summit.png'),
  arrow: require('../../assets/art-arrow.png'),
  medal: require('../../assets/art-medal.png'),
  gear: require('../../assets/art-gear.png'),
  chain: require('../../assets/art-chain.png'),
  ember: require('../../assets/art-ember.png'),
  burst: require('../../assets/art-burst.png'),
  banner: require('../../assets/banner-sunrise.png'),
  bgDesk: require('../../assets/bg-desk.png'),
  bgStairs: require('../../assets/bg-stairs.png'),
  bgPillar: require('../../assets/bg-pillar.png'),
} as const;

export type ArtName = keyof typeof ART;

/** 正方形のアートを表示する（背景と馴染むよう contain 表示） */
export function Art({
  name,
  size = 120,
  style,
  opacity = 1,
}: {
  name: ArtName;
  size?: number;
  style?: StyleProp<ImageStyle>;
  opacity?: number;
}) {
  return (
    <Image
      source={ART[name]}
      style={[{ width: size, height: size, opacity }, style]}
      resizeMode="contain"
    />
  );
}

/**
 * 背景としてアートを敷く（コンテンツの背後・薄く）。
 * children がその上に乗る。
 */
export function ArtBackdrop({
  name,
  children,
  opacity = 0.16,
  style,
  imageStyle,
}: {
  name: ArtName;
  children?: React.ReactNode;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={ART[name]}
          style={[StyleSheet.absoluteFillObject, { opacity }, imageStyle]}
          resizeMode="cover"
        />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  content: { position: 'relative', zIndex: 2 },
});
