import { Image, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { Colors } from '@/constants/colors'
import type { FloatingReaction, ListenTogetherRoom } from '@/hooks/useListenTogether'

const QUICK_REACTIONS = ['🔥', '❤️', '🎶', '😮', '😂']

interface ListenTogetherBarProps {
  room: ListenTogetherRoom
  reactions: FloatingReaction[]
  isPlaying: boolean
  progress: number
  onLeave: () => void
  onReact: (emoji: string) => void
}

/** Compact Listen-Together control bar shown atop the message list while a room is active (7.1). */
export function ListenTogetherBar({ room, reactions, isPlaying, progress, onLeave, onReact }: ListenTogetherBarProps) {
  return (
    <View className="mx-4 my-2 rounded-2xl overflow-hidden" style={{ backgroundColor: Colors.primaryContainer }}>
      <View className="flex-row items-center gap-3 p-3">
        {room.track.artworkUrl ? (
          <Image source={{ uri: room.track.artworkUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} />
        ) : (
          <View className="items-center justify-center" style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Ionicons name="musical-notes" size={20} color={Colors.onPrimary} />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Listening together {room.isHost ? '· host' : ''} {isPlaying ? '▶' : '⏸'}
          </Text>
          <Text className="text-[14px] font-semibold" style={{ color: Colors.onPrimary }} numberOfLines={1}>
            {room.track.title}{room.track.artist ? ` — ${room.track.artist}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLeave() }} className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <Ionicons name="exit-outline" size={18} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <View className="h-1 mx-3" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
        <View className="h-full" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, backgroundColor: Colors.onPrimary }} />
      </View>

      <View className="flex-row items-center gap-2 px-3 py-2">
        {QUICK_REACTIONS.map(emoji => (
          <TouchableOpacity key={emoji} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReact(emoji) }} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
          </TouchableOpacity>
        ))}
        {/* Floating reactions */}
        <View className="flex-1 flex-row justify-end items-center gap-0.5">
          {reactions.slice(-5).map(r => (
            <Text key={r.id} style={{ fontSize: 18 }}>{r.emoji}</Text>
          ))}
        </View>
      </View>
    </View>
  )
}
