import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { avatarColor } from '@/logic/social';
import { colors } from '@/theme';

/** 名前の頭文字で作る丸アバター（仲間・ランキング用）。 */
export function Avatar({ name, size = 40, isMe = false }: { name: string; size?: number; isMe?: boolean }) {
  const bg = isMe ? colors.flame : avatarColor(name);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '900' },
});
