import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'
import type { ListeningParty } from '@/hooks/useListenTogether'

interface ListeningPartyBarProps {
  party: ListeningParty
  joined: boolean
  onJoin: () => void
}

function countdown(startAt: string, now: number): string {
  const seconds = Math.max(0, Math.ceil((new Date(startAt).getTime() - now) / 1000))
  if (seconds <= 0) return 'Starting now'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  return hours > 0
    ? `Starts in ${hours}h ${minutes}m`
    : `Starts in ${minutes}:${remaining.toString().padStart(2, '0')}`
}

/** Countdown and join control for a scheduled position-sync listening party (ticket 6.2). */
export function ListeningPartyBar({ party, joined, onJoin }: ListeningPartyBarProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timing = party.status === 'STARTED' ? 'Live now' : countdown(party.startAt, now)
  return (
    <View className="mx-4 my-2 flex-row items-center gap-3 rounded-2xl bg-surface-container-high p-3">
      {party.track.artworkUrl ? (
        <Image source={{ uri: party.track.artworkUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
          <Ionicons name="calendar" size={20} color={Colors.primary} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-[11px] font-bold uppercase text-primary">{timing}</Text>
        <Text className="text-sm font-semibold text-on-surface" numberOfLines={1}>
          {party.track.title} · listening party
        </Text>
      </View>
      <TouchableOpacity
        onPress={onJoin}
        disabled={joined}
        className="rounded-full bg-primary px-3 py-2"
        style={{ opacity: joined ? 0.55 : 1 }}
      >
        <Text className="text-xs font-bold text-on-primary">{joined ? 'Joined' : 'Join'}</Text>
      </TouchableOpacity>
    </View>
  )
}
