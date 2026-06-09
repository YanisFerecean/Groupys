import { Image, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Colors } from '@/constants/colors'
import type { NowPlayingTrack } from '@/models/Chat'

interface NowPlayingPillProps {
  track: NowPlayingTrack
  onPress: () => void
}

/**
 * Compact live now-playing pill for the chat header (ticket 1.2). Tiny art + "♫ Title — Artist".
 * Rendered only when the partner has a live, playing track.
 */
export function NowPlayingPill({ track, onPress }: NowPlayingPillProps) {
  const label = track.artist ? `${track.title} — ${track.artist}` : track.title
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="mt-1 flex-row items-center gap-1.5 self-start rounded-full px-2 py-1"
      style={{ backgroundColor: Colors.primaryContainer, maxWidth: 220 }}
    >
      {track.artworkUrl ? (
        <Image source={{ uri: track.artworkUrl }} style={{ width: 16, height: 16, borderRadius: 3 }} />
      ) : (
        <Ionicons name="musical-note" size={12} color={Colors.onPrimary} />
      )}
      <Text className="text-[11px] font-semibold" numberOfLines={1} style={{ color: Colors.onPrimary }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}
