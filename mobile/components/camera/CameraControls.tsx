import { Ionicons } from '@expo/vector-icons'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated'

import { Colors } from '@/constants/colors'
import type { CameraMode } from '@/types/camera'

function mmss(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

interface CameraControlsProps {
  mode: CameraMode
  allowPhoto: boolean
  allowVideo: boolean
  flashOn: boolean
  isRecording: boolean
  recordSeconds: number
  isBusy: boolean
  onClose: () => void
  onToggleFlash: () => void
  onToggleFacing: () => void
  onTakePhoto: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

/** Absolute overlay on top of the live camera preview: close/flash/flip + the capture button. */
export function CameraControls({
  mode,
  allowPhoto,
  allowVideo,
  flashOn,
  isRecording,
  recordSeconds,
  isBusy,
  onClose,
  onToggleFlash,
  onToggleFacing,
  onTakePhoto,
  onStartRecording,
  onStopRecording,
}: CameraControlsProps) {
  const insets = useSafeAreaInsets()
  const ring = useSharedValue(1)

  useEffect(() => {
    if (isRecording) {
      ring.value = withRepeat(withTiming(1.15, { duration: 600 }), -1, true)
    } else {
      cancelAnimation(ring)
      ring.value = withTiming(1, { duration: 150 })
    }
  }, [isRecording, ring])

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ring.value }] }))

  const canPhoto = allowPhoto && (mode === 'photo' || mode === 'both')
  const canVideo = allowVideo && (mode === 'video' || mode === 'both')

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      {/* Top bar */}
      <View
        style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        pointerEvents="box-none"
      >
        <RoundButton icon="close" onPress={onClose} />
        {isRecording ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary }} />
            <Text style={{ color: '#fff', fontWeight: '700' }}>{mmss(recordSeconds)}</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <RoundButton icon={flashOn ? 'flash' : 'flash-off'} onPress={onToggleFlash} active={flashOn} />
            <RoundButton icon="camera-reverse" onPress={onToggleFacing} />
          </View>
        )}
      </View>

      {/* Capture button */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 28, left: 0, right: 0, alignItems: 'center' }} pointerEvents="box-none">
        <Pressable
          disabled={isBusy && !isRecording}
          delayLongPress={220}
          onPress={() => { if (canPhoto && !isRecording) onTakePhoto() }}
          onLongPress={() => { if (canVideo && !isRecording) onStartRecording() }}
          onPressOut={() => { if (isRecording) onStopRecording() }}
          hitSlop={16}
        >
          <Animated.View
            style={[
              {
                width: 84,
                height: 84,
                borderRadius: 42,
                borderWidth: 5,
                borderColor: isRecording ? Colors.primary : '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              },
              ringStyle,
            ]}
          >
            <View
              style={{
                width: isRecording ? 34 : 66,
                height: isRecording ? 34 : 66,
                borderRadius: isRecording ? 8 : 33,
                backgroundColor: isRecording ? Colors.primary : '#fff',
              }}
            />
          </Animated.View>
        </Pressable>
        {!isRecording ? (
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 12, fontSize: 12, fontWeight: '600' }}>
            {canPhoto && canVideo ? 'Tap for photo · Hold for video' : canVideo ? 'Hold to record' : 'Tap for photo'}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function RoundButton({ icon, onPress, active }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: active ? Colors.primary : 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={22} color="#fff" />
    </Pressable>
  )
}
