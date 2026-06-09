import { useState } from 'react'
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'

import { CardActionButton } from '@/components/music/CardActionButton'
import { Colors } from '@/constants/colors'
import { useChatActions } from '@/components/chat/ChatActionsContext'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { isBlindListenPayload } from '@/models/ChatPayloads'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'

/**
 * BLIND_LISTEN renderer (ticket 4.6). While hidden: blurred art, hidden metadata, preview only,
 * and a Guess input. After reveal (propagated over WS), shows the track + correct/incorrect.
 */
export function BlindListenCardMessage({ message, isMine }: MessageRendererProps) {
  const payload = message.payload
  const preview = usePreviewPlayer()
  const actions = useChatActions()
  const [guessing, setGuessing] = useState(false)
  const [guess, setGuess] = useState('')

  if (!isBlindListenPayload(payload)) {
    return null
  }

  const { track } = payload
  const hidden = payload.hidden && !payload.guessed
  const trackId = `${track.id || message.id}:blind`
  const hasPreview = !!track.previewUrl
  const isActive = preview.isActive(trackId)
  const progress = isActive && preview.durationSec > 0 ? preview.positionSec / preview.durationSec : 0

  const submitGuess = () => {
    const value = guess.trim()
    if (!value) return
    actions.revealBlindListen?.(message.id, value)
    setGuessing(false)
    setGuess('')
  }

  return (
    <View className="w-72 rounded-2xl overflow-hidden" style={{ backgroundColor: Colors.surfaceContainerHigh }}>
      <View className="flex-row items-center gap-3 p-3">
        <View style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden' }}>
          {track.artworkUrl ? (
            <Image source={{ uri: track.artworkUrl }} style={{ width: 56, height: 56 }} />
          ) : (
            <View style={{ width: 56, height: 56, backgroundColor: Colors.surfaceContainerHighest }} />
          )}
          {hidden ? (
            <BlurView
              tint="dark"
              intensity={60}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="help" size={26} color="#fff" />
            </BlurView>
          ) : null}
        </View>

        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase" style={{ color: Colors.onSurfaceVariant }}>
            Blind listen
          </Text>
          {hidden ? (
            <Text className="text-[15px] font-semibold text-on-surface">Guess the song</Text>
          ) : (
            <>
              <Text className="text-[15px] font-semibold text-on-surface" numberOfLines={1}>{track.title}</Text>
              <Text className="text-[13px] text-on-surface-variant" numberOfLines={1}>{track.artist}</Text>
            </>
          )}
        </View>
      </View>

      {hasPreview ? (
        <View className="h-1 mx-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
          <View className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, backgroundColor: Colors.primary }} />
        </View>
      ) : null}

      <View className="flex-row items-center gap-2 px-3 pb-3 pt-2">
        {hasPreview ? (
          <CardActionButton
            icon={isActive && preview.isPlaying ? 'pause' : 'play'}
            label="Preview"
            onPress={() => preview.toggle(trackId, track.previewUrl!)}
          />
        ) : null}
        {hidden && !isMine ? (
          guessing ? null : (
            <CardActionButton icon="bulb" label="Guess" onPress={() => setGuessing(true)} />
          )
        ) : null}
      </View>

      {hidden && !isMine && guessing ? (
        <View className="flex-row items-center gap-2 px-3 pb-3">
          <TextInput
            className="flex-1 rounded-full bg-surface px-3 py-2 text-[14px] text-on-surface"
            placeholder="Title or artist…"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={guess}
            onChangeText={setGuess}
            autoFocus
            onSubmitEditing={submitGuess}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={submitGuess} className="h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Ionicons name="arrow-up" size={18} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      ) : null}

      {payload.guessed ? (
        <View className="flex-row items-center gap-1.5 px-3 pb-3">
          <Ionicons
            name={payload.guessCorrect ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={payload.guessCorrect ? Colors.tertiary : Colors.primary}
          />
          <Text className="text-[13px] font-semibold text-on-surface">
            {payload.guessCorrect ? 'Correct!' : 'Not quite'}
            {payload.guessText ? ` — guessed “${payload.guessText}”` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
