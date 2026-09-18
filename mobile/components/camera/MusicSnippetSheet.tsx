import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import { useAppleMusicPlayer } from '@/hooks/useAppleMusicPlayer'
import { Colors } from '@/constants/colors'
import type { TrackPayload } from '@/models/ChatPayloads'

const SNIPPET_SEC = 30

function mmss(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

interface MusicSnippetSheetProps {
  visible: boolean
  track: TrackPayload | null
  onClose: () => void
  onConfirm: (snippetStartMs: number, snippetDurationMs: number) => void
}

/**
 * Picks a 30s window of the **full** song (Apple Music subscribers only). Loads the song through
 * the native player, lets the user drag the window start across the whole duration, and previews
 * the selected window (seek + auto-stop at the window end).
 */
export function MusicSnippetSheet({ visible, track, onClose, onConfirm }: MusicSnippetSheetProps) {
  const apple = useAppleMusicPlayer()
  const [startSec, setStartSec] = useState(0)
  const [barWidth, setBarWidth] = useState(0)

  const trackId = track?.id ?? ''
  const storeId = track?.appleMusicId
  const duration = apple.durationSec
  const maxStart = Math.max(0, duration - SNIPPET_SEC)
  const isActive = apple.isActive(trackId)
  const loading = !!storeId && apple.ready && (!isActive || duration <= 0)

  // Load the song when the sheet opens; stop it when it closes.
  useEffect(() => {
    if (visible && track && storeId && apple.ready) {
      setStartSec(0)
      apple.play(trackId, storeId)
    }
    return () => {
      apple.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, trackId])

  // Keep playback inside the chosen 30s window.
  useEffect(() => {
    if (!isActive || !apple.isPlaying) return
    if (apple.positionSec >= startSec + SNIPPET_SEC || apple.positionSec < startSec - 1) {
      apple.pause()
    }
  }, [apple, isActive, startSec])

  const applyStart = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(maxStart, next))
    setStartSec(clamped)
  }, [maxStart])

  const seekToStart = useCallback((sec: number) => {
    apple.seek(sec)
    apple.resume()
  }, [apple])

  const pan = Gesture.Pan()
    .onUpdate(event => {
      if (barWidth <= 0 || maxStart <= 0) return
      const fraction = Math.max(0, Math.min(1, event.x / barWidth))
      runOnJS(applyStart)(fraction * maxStart)
    })
    .onEnd(() => {
      runOnJS(seekToStart)(startSec)
    })

  const togglePlay = () => {
    if (isActive && apple.isPlaying) apple.pause()
    else seekToStart(startSec)
  }

  const confirmRef = useRef(onConfirm)
  confirmRef.current = onConfirm
  const handleConfirm = () => {
    apple.stop()
    confirmRef.current(Math.round(startSec * 1000), SNIPPET_SEC * 1000)
  }

  const windowFraction = duration > 0 ? SNIPPET_SEC / duration : 1
  const startFraction = maxStart > 0 ? startSec / maxStart : 0
  const playheadFraction = duration > 0 ? Math.max(0, Math.min(1, apple.positionSec / duration)) : 0

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-on-surface">Pick a 30-second moment</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {track ? (
            <View className="mb-5 flex-row items-center gap-3">
              {track.artworkUrl ? (
                <Image source={{ uri: track.artworkUrl }} style={{ width: 52, height: 52, borderRadius: 10 }} contentFit="cover" />
              ) : (
                <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="musical-note" size={22} color="#fff" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-base font-bold text-on-surface" numberOfLines={1}>{track.title}</Text>
                <Text className="text-sm text-on-surface-variant" numberOfLines={1}>{track.artist}</Text>
              </View>
            </View>
          ) : null}

          {!storeId ? (
            <Text className="py-6 text-center text-sm font-medium text-on-surface-variant">
              This track can&apos;t be used for snippets (no Apple Music catalog id).
            </Text>
          ) : !apple.ready ? (
            <Text className="py-6 text-center text-sm font-medium text-on-surface-variant">
              Full-song snippets need Apple Music on this device.
            </Text>
          ) : loading ? (
            <View className="py-8 items-center">
              <ActivityIndicator color={Colors.primary} />
              <Text className="mt-3 text-sm text-on-surface-variant">Loading song…</Text>
            </View>
          ) : (
            <>
              {/* Scrubber: drag the highlighted 30s window across the whole song. */}
              <GestureDetector gesture={pan}>
                <View
                  onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
                  style={{ height: 56, borderRadius: 14, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', overflow: 'hidden' }}
                >
                  {/* selected window */}
                  <View
                    style={{
                      position: 'absolute',
                      left: `${startFraction * (1 - windowFraction) * 100}%`,
                      width: `${windowFraction * 100}%`,
                      top: 0,
                      bottom: 0,
                      backgroundColor: `${Colors.primary}33`,
                      borderWidth: 2,
                      borderColor: Colors.primary,
                      borderRadius: 14,
                    }}
                  />
                  {/* playhead */}
                  <View style={{ position: 'absolute', left: `${playheadFraction * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: Colors.onSurface }} />
                  <Text style={{ position: 'absolute', alignSelf: 'center', color: Colors.onSurfaceVariant, fontSize: 12, fontWeight: '600' }}>
                    Drag to choose
                  </Text>
                </View>
              </GestureDetector>

              <View className="mt-2 flex-row justify-between">
                <Text className="text-xs font-medium text-on-surface-variant">{mmss(startSec)}</Text>
                <Text className="text-xs font-medium text-on-surface-variant">{mmss(startSec + SNIPPET_SEC)}</Text>
              </View>

              <View className="mt-5 flex-row items-center gap-3">
                <Pressable
                  onPress={togglePlay}
                  style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={isActive && apple.isPlaying ? 'pause' : 'play'} size={24} color={Colors.primary} />
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text className="text-base font-bold text-on-primary">Use this moment</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}
