import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  Pressable,
  PanResponder,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { colors, font, radius, spacing } from '@/theme';

interface Props {
  visible: boolean;
  imageUri: string | null;
  imageW: number;
  imageH: number;
  onCancel: () => void;
  onDone: (dataUri: string) => void;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * 正方形の切り抜きエディタ。
 * ドラッグで位置調整、スライダーで拡大率を変え、選んだ範囲だけを丸く使う。
 * 実際の切り抜きは expo-image-manipulator で行い、data URI を返す。
 */
export function PhotoCropper({ visible, imageUri, imageW, imageH, onCancel, onDone }: Props) {
  const [viewport, setViewport] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const committed = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  // cover させる基準スケール（zoom=1で正方形を埋める）
  const baseScale = imageW && imageH ? viewport / Math.min(imageW, imageH) : 1;
  const scale = baseScale * zoom;
  const dispW = imageW * scale;
  const dispH = imageH * scale;
  const maxX = Math.max(0, (dispW - viewport) / 2);
  const maxY = Math.max(0, (dispH - viewport) / 2);

  const clampOffset = (x: number, y: number, z: number) => {
    const s = baseScale * z;
    const mx = Math.max(0, (imageW * s - viewport) / 2);
    const my = Math.max(0, (imageH * s - viewport) / 2);
    return { x: clamp(x, -mx, mx), y: clamp(y, -my, my) };
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        const next = clampOffset(committed.current.x + g.dx, committed.current.y + g.dy, zoomRef.current);
        setOffset(next);
      },
      onPanResponderRelease: () => {
        committed.current = { ...offsetRef.current };
      },
    })
  ).current;

  // offset を ref でも保持（PanResponder のクロージャ用）
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  const onViewportLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w && Math.abs(w - viewport) > 1) setViewport(w);
  };

  const onZoom = (z: number) => {
    const nz = clamp(z, 1, 4);
    setZoom(nz);
    const next = clampOffset(committed.current.x, committed.current.y, nz);
    committed.current = next;
    setOffset(next);
  };

  const confirm = async () => {
    if (!imageUri || busy) return;
    setBusy(true);
    try {
      const s = scale;
      const size = viewport / s;
      let originX = imageW / 2 - (viewport / 2 + offset.x) / s;
      let originY = imageH / 2 - (viewport / 2 + offset.y) / s;
      originX = clamp(originX, 0, Math.max(0, imageW - size));
      originY = clamp(originY, 0, Math.max(0, imageH - size));
      const cropSize = Math.min(size, imageW - originX, imageH - originY);

      const result = await manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width: cropSize, height: cropSize } },
          { resize: { width: 512, height: 512 } },
        ],
        { compress: 0.8, format: SaveFormat.JPEG, base64: true }
      );
      const dataUri = result.base64
        ? `data:image/jpeg;base64,${result.base64}`
        : result.uri;
      onDone(dataUri);
    } catch {
      // 失敗時はそのままキャンセル扱い
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>切り抜く範囲を決める</Text>
          <Text style={styles.hint}>ドラッグで移動・スライダーで拡大</Text>

          {/* ビューポート（正方形） */}
          <View style={styles.viewport} onLayout={onViewportLayout} {...pan.panHandlers}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{
                  position: 'absolute',
                  width: dispW,
                  height: dispH,
                  left: (viewport - dispW) / 2 + offset.x,
                  top: (viewport - dispH) / 2 + offset.y,
                }}
              />
            ) : null}
            {/* 丸マスクのガイド */}
            <View style={styles.maskRing} pointerEvents="none" />
            <View style={styles.grid} pointerEvents="none">
              <View style={styles.gridV} />
              <View style={[styles.gridV, { left: '66%' }]} />
              <View style={styles.gridH} />
              <View style={[styles.gridH, { top: '66%' }]} />
            </View>
          </View>

          {/* ズームスライダー */}
          <View style={styles.zoomRow}>
            <Ionicons name="image" size={16} color={colors.textSub} />
            <Slider value={zoom} min={1} max={4} onChange={onZoom} />
            <Ionicons name="image" size={24} color={colors.textSub} />
          </View>

          {/* ボタン */}
          <View style={styles.btnRow}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onCancel} disabled={busy}>
              <Text style={styles.btnGhostText}>キャンセル</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={confirm} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.btnPrimaryText}>この範囲で決定</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** 依存を増やさない簡易スライダー（PanResponderでトラックを操作） */
function Slider({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  widthRef.current = width;

  const setFromX = (x: number) => {
    const w = widthRef.current || 1;
    const ratio = clamp(x / w, 0, 1);
    onChange(min + ratio * (max - min));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    })
  ).current;

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <View
      style={sliderStyles.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <View style={[sliderStyles.fill, { width: `${pct}%` }]} />
      <View style={[sliderStyles.thumb, { left: `${pct}%` }]} />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    marginLeft: -11,
    borderWidth: 3,
    borderColor: colors.bg,
  },
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  title: { fontSize: font.heading, fontWeight: '900', color: colors.text, textAlign: 'center' },
  hint: { fontSize: font.small, color: colors.textSub, textAlign: 'center', marginTop: 4 },

  viewport: {
    width: '100%',
    aspectRatio: 1,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  maskRing: {
    position: 'absolute',
    top: '4%',
    left: '4%',
    right: '4%',
    bottom: '4%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  grid: { ...StyleSheet.absoluteFillObject },
  gridV: { position: 'absolute', top: 0, bottom: 0, left: '33%', width: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  gridH: { position: 'absolute', left: 0, right: 0, top: '33%', height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },

  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },

  btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  btn: { flex: 1, height: 50, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { fontSize: font.body, fontWeight: '800', color: colors.text },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: font.body, fontWeight: '800', color: colors.onAccent },
});
