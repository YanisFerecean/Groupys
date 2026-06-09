import { useCallback, useState } from 'react'
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useFocusEffect } from 'expo-router'

import { NowPlayingTrackSheet } from '@/components/music/NowPlayingTrackSheet'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { fetchCommunityMembers } from '@/lib/api'
import { logError } from '@/lib/logging'
import type { CommunityMemberResDto } from '@/models/CommunityMemberRes'
import type { NowPlayingTrack } from '@/models/Chat'

interface CommunityListeningRosterProps {
  communityId: string
}

/**
 * "Listening now" roster (ticket 6.3): community members with a live, opted-in now-playing
 * track (reusing the NOW_PLAYING fan-out, now extended to community co-members). Tap → preview.
 */
export function CommunityListeningRoster({ communityId }: CommunityListeningRosterProps) {
  const { getToken } = useAuth()
  const { getNowPlaying } = useChat()
  const [members, setMembers] = useState<CommunityMemberResDto[]>([])
  const [viewing, setViewing] = useState<NowPlayingTrack | null>(null)

  const load = useCallback(async () => {
    try {
      const token = await getToken()
      setMembers(await fetchCommunityMembers(communityId, token))
    } catch (error) {
      logError('[roster] failed to load members', error)
    }
  }, [communityId, getToken])

  useFocusEffect(useCallback(() => {
    void load()
  }, [load]))

  const listening = members
    .map(member => ({ member, np: getNowPlaying(member.userId) }))
    .filter(entry => entry.np?.track && entry.np.isPlaying)

  if (listening.length === 0) {
    return null
  }

  return (
    <View className="py-3">
      <Text className="px-5 pb-2 text-sm font-bold text-on-surface">Listening now</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
        {listening.map(({ member, np }) => (
          <TouchableOpacity key={member.userId} className="items-center" style={{ width: 70 }} onPress={() => setViewing(np!.track)}>
            <View className="rounded-full overflow-hidden" style={{ width: 52, height: 52, borderWidth: 2, borderColor: Colors.tertiary }}>
              {member.profileImage ? (
                <Image source={{ uri: member.profileImage }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <View className="items-center justify-center bg-surface-container-high" style={{ width: 48, height: 48, borderRadius: 24 }}>
                  <Ionicons name="person" size={20} color={Colors.onSurfaceVariant} />
                </View>
              )}
            </View>
            <Text className="mt-1 text-[11px] font-semibold text-on-surface" numberOfLines={1}>
              {member.displayName || member.username}
            </Text>
            <Text className="text-[10px] text-on-surface-variant" numberOfLines={1}>
              ♫ {np!.track!.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <NowPlayingTrackSheet visible={viewing !== null} track={viewing} onClose={() => setViewing(null)} />
    </View>
  )
}
