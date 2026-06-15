import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { Pressable, Text, View } from 'react-native'

import { Colors } from '@/constants/colors'
import type { MediaMusicAttachment } from '@/models/ChatPayloads'

const OVERLAY_WIDTH = 200

interface MediaMusicOverlayProps {
  music: MediaMusicAttachment
  containerWidth: number
  containerHeight: number
  /** Editor mode: the overlay is draggable and reports normalized position. */
  interactive?: boolean
  onChangePosition?: (position: { x: number; y: number }) => void
  /** Playback (message/preview side). */
  isPlaying?: boolean
  progress?: number
  onPlayToggle?: () => void
}

/**
 * The Instagram-story-style music pill drawn over a photo/video. Single source of truth for both
 * the camera editor (draggable) and the received message bubble (static + play toggle), so the
 * overlay looks identical wherever it appears.
 */
export function MediaMusicOverlay({
  music,
  containerWidth,
  containerHeight,
  interactive = false,
  onChangePosition,
  isPlaying = false,
  progress = 0,
  onPlayToggle,
}: MediaMusicOverlayProps) {
  const { track, style, lyric } = music
  const startX = music.position.x * containerWidth
  const startY = music.position.y * containerHeight

  const translateX = useSharedValue(startX)
  const translateY = useSharedValue(startY)
  const offsetX = useSharedValue(startX)
  const offsetY = useSharedValue(startY)

  const commit = (x: number, y: number) => {
    onChangePosition?.({
      x: Math.max(0, Math.min(1, x / containerWidth)),
      y: Math.max(0, Math.min(1, y / containerHeight)),
    })
  }

  const pan = Gesture.Pan()
    .enabled(interactive)
    .onUpdate(event => {
      translateX.value = offsetX.value + event.translationX
      translateY.value = offsetY.value + event.translationY
    })
    .onEnd(() => {
      const clampedX = Math.max(0, Math.min(containerWidth - 40, translateX.value))
      const clampedY = Math.max(0, Math.min(containerHeight - 40, translateY.value))
      translateX.value = clampedX
      translateY.value = clampedY
      offsetX.value = clampedX
      offsetY.value = clampedY
      runOnJS(commit)(clampedX, clampedY)
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }))

  const subtitle = track.artist || track.album

  const pill = (
    <View
      style={{
        width: style === 'lyric' ? undefined : OVERLAY_WIDTH,
        maxWidth: containerWidth - 24,
      }}
    >
      {style === 'lyric' && lyric ? (
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.55)',
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="musical-notes" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, flexShrink: 1 }} numberOfLines={3}>
            {lyric}
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.55)',
            borderRadius: style === 'sticker' ? 18 : 26,
            padding: style === 'sticker' ? 8 : 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {track.artworkUrl ? (
            <Image
              source={{ uri: track.artworkUrl }}
              style={{ width: style === 'sticker' ? 48 : 36, height: style === 'sticker' ? 48 : 36, borderRadius: style === 'sticker' ? 10 : 18 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: style === 'sticker' ? 48 : 36,
                height: style === 'sticker' ? 48 : 36,
                borderRadius: style === 'sticker' ? 10 : 18,
                backgroundColor: Colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="musical-note" size={18} color="#fff" />
            </View>
          )}
          <View style={{ flexShrink: 1, paddingRight: onPlayToggle ? 0 : 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
              {track.title}
            </Text>
            {subtitle ? (
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {onPlayToggle ? (
            <Pressable
              onPress={onPlayToggle}
              hitSlop={8}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: Colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 4,
              }}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={15} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      )}
      {onPlayToggle && progress > 0 ? (
        <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 4, marginHorizontal: 8 }}>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: '#fff', width: `${Math.round(progress * 100)}%` }} />
        </View>
      ) : null}
    </View>
  )

  // Received/preview side: static, positioned by the saved normalized coordinates (no gesture root needed).
  if (!interactive) {
    return (
      <View style={{ position: 'absolute', top: startY, left: startX }} pointerEvents="box-none">
        {pill}
      </View>
    )
  }

  // Editor side: draggable.
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, animatedStyle]}>{pill}</Animated.View>
    </GestureDetector>
  )
}
