import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import type { TrackPayload } from '@/models/ChatPayloads'

interface TrackReactionChipProps {
  track: TrackPayload
  count: number
  mine: boolean
}

/** Compact track reaction that previews its public 30-second clip on tap (ticket 4.5). */
export function TrackReactionChip({ track, count, mine }: TrackReactionChipProps) {
  const preview = usePreviewPlayer()
  const previewId = `reaction-${track.id}`
  const isPlaying = preview.isActive(previewId) && preview.isPlaying

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      disabled={!track.previewUrl}
      onPress={() => track.previewUrl && preview.toggle(previewId, track.previewUrl)}
      className="max-w-[250px] flex-row items-center gap-1.5 rounded-full px-2 py-1"
      style={{ backgroundColor: mine ? Colors.primaryContainer : Colors.surfaceContainerHigh }}
    >
      {track.artworkUrl ? (
        <Image source={{ uri: track.artworkUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} />
      ) : (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-surface-container-highest">
          <Ionicons name="musical-note" size={12} color={Colors.onSurfaceVariant} />
        </View>
      )}
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={12} color={mine ? Colors.onPrimary : Colors.primary} />
      <Text
        className="flex-shrink text-[11px] font-semibold"
        style={{ color: mine ? Colors.onPrimary : Colors.onSurface }}
        numberOfLines={1}
      >
        {track.title}
      </Text>
      {count > 1 ? (
        <Text className="text-[10px] font-bold" style={{ color: mine ? Colors.onPrimary : Colors.onSurfaceVariant }}>
          {count}
        </Text>
      ) : null}
    </TouchableOpacity>
  )
}
