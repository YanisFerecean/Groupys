import { Ionicons } from '@expo/vector-icons'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Image, Text, View } from 'react-native'

import { Colors } from '@/constants/colors'
import type { NowPlayingTrack } from '@/models/Chat'

const GLASS = isLiquidGlassAvailable()

interface NowPlayingPillProps {
  track: NowPlayingTrack
}

/**
 * Compact live now-playing pill for the chat header (ticket 1.2). Tiny art + "♫ Title — Artist".
 * Display-only — rendered when the partner has a live, playing track. The title ellipsizes so a
 * long name never overflows the header column.
 */
export function NowPlayingPill({ track }: NowPlayingPillProps) {
  const label = track.artist ? `${track.title} — ${track.artist}` : track.title

  const inner = (
    <>
      {track.artworkUrl ? (
        <Image source={{ uri: track.artworkUrl }} style={{ width: 16, height: 16, borderRadius: 3 }} />
      ) : (
        <Ionicons name="musical-note" size={12} color={GLASS ? Colors.onSurface : Colors.onPrimary} />
      )}
      <Text
        className="text-[11px] font-semibold"
        numberOfLines={1}
        style={{ color: GLASS ? Colors.onSurface : Colors.onPrimary, flexShrink: 1 }}
      >
        {label}
      </Text>
    </>
  )

  if (GLASS) {
    return (
      <GlassView
        tintColor={`${Colors.primary}33`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4, alignSelf: 'flex-start', maxWidth: '100%' }}
      >
        {inner}
      </GlassView>
    )
  }

  return (
    <View
      className="mt-1 flex-row items-center gap-1.5 self-start rounded-full px-2 py-1"
      style={{ backgroundColor: Colors.primaryContainer, alignSelf: 'flex-start', maxWidth: '100%' }}
    >
      {inner}
    </View>
  )
}
