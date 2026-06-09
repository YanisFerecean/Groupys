import { Linking, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { TrackCard } from '@/components/music/TrackCard'
import { CardActionButton } from '@/components/music/CardActionButton'
import { Colors } from '@/constants/colors'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { isDedicationPayload } from '@/models/ChatPayloads'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'

function appleMusicLink(title: string, artist: string, explicit?: string): string {
  if (explicit && (explicit.startsWith('music://') || explicit.startsWith('http'))) {
    return explicit
  }
  return `https://music.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`.trim())}`
}

/** DEDICATION renderer (ticket 4.3): a track card with a heart accent + optional note. */
export function DedicationCardMessage({ message, isMine }: MessageRendererProps) {
  const payload = message.payload
  const preview = usePreviewPlayer()

  if (!isDedicationPayload(payload)) {
    return null
  }

  const trackId = payload.id || message.id
  const hasPreview = !!payload.previewUrl
  const isActive = preview.isActive(trackId)
  const progress = isActive && preview.durationSec > 0 ? preview.positionSec / preview.durationSec : 0

  return (
    <View className="w-72 rounded-2xl overflow-hidden" style={{ backgroundColor: Colors.secondaryContainer }}>
      <View className="flex-row items-center gap-1.5 px-3 pt-3 pb-1">
        <Ionicons name="heart" size={15} color={Colors.primary} />
        <Text className="text-[12px] font-bold uppercase" style={{ color: Colors.onSurface }}>
          This made me think of you
        </Text>
      </View>
      {payload.note ? (
        <Text className="px-3 pb-2 text-[14px] italic" style={{ color: Colors.onSurface }}>
          “{payload.note}”
        </Text>
      ) : null}
      <TrackCard
        title={payload.title}
        subtitle={payload.artist}
        artworkUrl={payload.artworkUrl}
        isMine={isMine}
        hasPreview={hasPreview}
        isPlaying={isActive && preview.isPlaying}
        progress={progress}
        onTogglePreview={hasPreview ? () => preview.toggle(trackId, payload.previewUrl!) : undefined}
        actions={
          <CardActionButton
            icon="open-outline"
            label="Open"
            onPress={() => {
              void Linking.openURL(appleMusicLink(payload.title, payload.artist, payload.appleMusicUrl)).catch(() => {})
            }}
            isMine={isMine}
          />
        }
      />
    </View>
  )
}
