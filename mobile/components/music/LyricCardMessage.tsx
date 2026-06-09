import { ImageBackground, Linking, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'
import { isLyricPayload } from '@/models/ChatPayloads'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'

function appleMusicLink(title: string, artist: string, explicit?: string): string {
  if (explicit && (explicit.startsWith('music://') || explicit.startsWith('http'))) {
    return explicit
  }
  return `https://music.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`.trim())}`
}

/**
 * LYRIC renderer (ticket 4.1): a styled quote card — big type over an art background, with
 * artist attribution. Tap opens the track (timestamp deep-link handled by ticket 4.2).
 */
export function LyricCardMessage({ message }: MessageRendererProps) {
  const payload = message.payload

  if (!isLyricPayload(payload)) {
    return null
  }

  const { track, lines } = payload
  const text = (lines ?? []).slice(0, 4).join('\n')

  const open = () => {
    void Linking.openURL(appleMusicLink(track.title, track.artist, track.appleMusicUrl)).catch(() => {})
  }

  const Body = (
    <View className="p-4" style={{ minHeight: 120, justifyContent: 'flex-end' }}>
      <Text className="text-[19px] font-bold leading-7" style={{ color: '#fff' }}>
        “{text}”
      </Text>
      <Text className="mt-2 text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {track.title}{track.artist ? ` — ${track.artist}` : ''}
      </Text>
    </View>
  )

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={open} className="w-72 rounded-2xl overflow-hidden">
      {track.artworkUrl ? (
        <ImageBackground source={{ uri: track.artworkUrl }} style={{ width: '100%' }} resizeMode="cover">
          <View style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>{Body}</View>
        </ImageBackground>
      ) : (
        <View style={{ backgroundColor: Colors.onSurface }}>{Body}</View>
      )}
    </TouchableOpacity>
  )
}
