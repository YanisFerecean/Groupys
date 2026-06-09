import { Ionicons } from '@expo/vector-icons'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { useEffect, useState } from 'react'
import { Pressable, Text, TouchableOpacity, View } from 'react-native'

import type { MessageRendererProps } from '@/components/chat/messageRenderers'
import { registerAudioStopper } from '@/lib/audioBus'
import { Colors } from '@/constants/colors'
import { normalizeMediaUrl } from '@/lib/media'
import { getVoiceBedSource } from '@/lib/voiceBeds'
import { isVoicePayload } from '@/models/ChatPayloads'

const GLASS = isLiquidGlassAvailable()

function durationLabel(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds))
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

/** Scrubbable voice-note renderer (ticket 3.8). */
export function VoiceMessage({ message, isMine }: MessageRendererProps) {
  const payload = message.payload
  const mediaUrl = normalizeMediaUrl(message.mediaUrl)
  const voicePayload = isVoicePayload(payload) ? payload : null
  const player = useAudioPlayer(mediaUrl ? { uri: mediaUrl } : null, { updateInterval: 100 })
  const status = useAudioPlayerStatus(player)
  const bedPlayer = useAudioPlayer(getVoiceBedSource(voicePayload?.bed?.id), { updateInterval: 250 })
  const [waveformWidth, setWaveformWidth] = useState(1)

  useEffect(() => {
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    if (!voicePayload?.bed) return
    bedPlayer.loop = true
    bedPlayer.volume = 0.18
  }, [bedPlayer, voicePayload?.bed])

  useEffect(() => {
    if (voicePayload?.bed && !status.playing) bedPlayer.pause()
  }, [bedPlayer, status.playing, voicePayload?.bed])

  // Halt this voice note when something stops all audio (e.g. leaving the chat).
  useEffect(() => registerAudioStopper(() => {
    try { player.pause() } catch { /* released */ }
    try { bedPlayer.pause() } catch { /* released */ }
  }), [player, bedPlayer])

  if (!mediaUrl || !voicePayload) return null

  const durationSec = status.duration > 0 ? status.duration : voicePayload.durationMs / 1000
  const progress = durationSec > 0 ? Math.min(1, status.currentTime / durationSec) : 0
  const currentLabel = status.currentTime > 0 ? status.currentTime : durationSec

  const sentTint = 'rgba(186, 0, 43, 0.92)'
  const receivedTint = 'rgba(255, 255, 255, 0.18)'

  const inner = (
    <>
      <TouchableOpacity
        onPress={() => {
          if (status.playing) {
            player.pause()
            if (voicePayload.bed) bedPlayer.pause()
          } else {
            void (async () => {
              const startAt = status.didJustFinish ? 0 : status.currentTime
              if (status.didJustFinish) await player.seekTo(0)
              if (voicePayload.bed) {
                await bedPlayer.seekTo(startAt % 30)
                bedPlayer.play()
              }
              player.play()
            })()
          }
        }}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : `${Colors.primary}22` }}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={22} color={isMine ? '#fff' : Colors.primary} />
      </TouchableOpacity>

      <View className="flex-1">
        <Pressable
          accessibilityLabel="Seek voice note"
          onLayout={event => setWaveformWidth(event.nativeEvent.layout.width)}
          onPress={event => {
            const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / waveformWidth))
            const position = ratio * durationSec
            void player.seekTo(position)
            if (voicePayload.bed) void bedPlayer.seekTo(position % 30)
          }}
          className="h-11 flex-row items-center gap-0.5"
        >
          {voicePayload.peaks.map((peak, index) => (
            <View
              key={`${index}-${peak}`}
              className="flex-1 rounded-full"
              style={{
                height: Math.max(4, Math.min(1, peak) * 34),
                backgroundColor: index / voicePayload.peaks.length <= progress
                  ? (isMine ? 'rgba(255,255,255,0.9)' : Colors.primary)
                  : (isMine ? 'rgba(255,255,255,0.35)' : Colors.outlineVariant),
              }}
            />
          ))}
        </Pressable>
        <Text className={`mt-0.5 text-[11px] font-semibold ${isMine ? 'text-white/75' : 'text-on-surface-variant'}`}>
          {durationLabel(currentLabel)}
        </Text>
        {voicePayload.bed ? (
          <Text className={`mt-0.5 text-[10px] font-semibold ${isMine ? 'text-white/70' : 'text-on-surface-variant'}`}>
            Backing: {voicePayload.bed.title}
          </Text>
        ) : null}
      </View>
    </>
  )

  if (GLASS) {
    return (
      <GlassView
        tintColor={isMine ? sentTint : receivedTint}
        style={{
          width: 288,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 24,
          borderBottomRightRadius: isMine ? 6 : 24,
          borderBottomLeftRadius: isMine ? 24 : 6,
          paddingHorizontal: 12,
          paddingVertical: 12,
        }}
      >
        {inner}
      </GlassView>
    )
  }

  return (
    <View
      className="w-72 flex-row items-center gap-3 rounded-[24px] px-3 py-3"
      style={{ backgroundColor: isMine ? Colors.primary : Colors.surfaceContainer }}
    >
      {inner}
    </View>
  )
}
