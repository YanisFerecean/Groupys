import { Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Colors } from '@/constants/colors'
import { useChatActions } from '@/components/chat/ChatActionsContext'
import { isTasteHandshakePayload } from '@/models/ChatPayloads'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'

function summarise(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length <= 2) return items.join(' & ')
  return `${items.slice(0, 2).join(', ')} + ${items.length - 2} more`
}

/** TASTE_HANDSHAKE icebreaker renderer (ticket 5.1). Neutral, full-width system card. */
export function TasteHandshakeMessage({ message }: MessageRendererProps) {
  const payload = message.payload
  const actions = useChatActions()

  if (!isTasteHandshakePayload(payload)) {
    return null
  }

  const artists = payload.sharedArtists ?? []
  const genres = payload.sharedGenres ?? []
  const topArtist = artists[0]

  const headline = artists.length > 0
    ? `You both love ${summarise(artists)}`
    : genres.length > 0
      ? `You both vibe with ${summarise(genres)}`
      : 'You both have eclectic taste — break the ice 🎶'

  return (
    <View
      className="w-80 max-w-full rounded-2xl p-4"
      style={{ backgroundColor: Colors.secondaryContainer }}
    >
      <View className="flex-row items-center gap-2 mb-1.5">
        <Ionicons name="sparkles" size={16} color={Colors.onSurface} />
        <Text className="text-[12px] font-bold uppercase" style={{ color: Colors.onSurface }}>
          Taste match
        </Text>
      </View>

      <Text className="text-[15px] font-semibold mb-3" style={{ color: Colors.onSurface }}>
        {headline}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {topArtist && actions.openTrackPicker ? (
          <TouchableOpacity
            onPress={() => actions.openTrackPicker?.(topArtist)}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: Colors.surface }}
          >
            <Ionicons name="musical-note" size={14} color={Colors.primary} />
            <Text className="text-[13px] font-semibold" style={{ color: Colors.onSurface }} numberOfLines={1}>
              Send a song by {topArtist}
            </Text>
          </TouchableOpacity>
        ) : null}
        {actions.openPartnerProfile ? (
          <TouchableOpacity
            onPress={() => actions.openPartnerProfile?.()}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: Colors.surface }}
          >
            <Ionicons name="person" size={14} color={Colors.primary} />
            <Text className="text-[13px] font-semibold" style={{ color: Colors.onSurface }}>
              See their profile
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}
