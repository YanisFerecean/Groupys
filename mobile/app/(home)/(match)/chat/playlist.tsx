import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Colors } from '@/constants/colors'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { getCollabPlaylist, type CollabPlaylistTrackRes } from '@/lib/api'

const GLASS = isLiquidGlassAvailable()

/** Full list of songs members added to this conversation's collaborative playlist (ticket 6.1). */
export default function CollabPlaylistScreen() {
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>()
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  const preview = usePreviewPlayer()

  const { data, isLoading } = useQuery({
    queryKey: ['collab-playlist', conversationId],
    queryFn: async () => {
      const token = await getToken()
      return getCollabPlaylist(conversationId!, token)
    },
    enabled: !!conversationId,
    staleTime: 15_000,
  })

  const tracks = data?.tracks ?? []

  const renderItem = ({ item }: { item: CollabPlaylistTrackRes }) => {
    const hasPreview = !!item.previewUrl
    const active = preview.isActive(item.trackId)
    const adder = item.addedByDisplayName || item.addedByUsername
    return (
      <TouchableOpacity
        activeOpacity={hasPreview ? 0.7 : 1}
        onPress={() => hasPreview && preview.toggle(item.trackId, item.previewUrl!)}
        className="flex-row items-center gap-3 px-5 py-2.5"
      >
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={{ width: 52, height: 52, borderRadius: 8 }} />
        ) : (
          <View
            className="items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: Colors.surfaceContainerHigh }}
          >
            <Ionicons name="musical-note" size={22} color={Colors.onSurfaceVariant} />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-on-surface" numberOfLines={1}>{item.title}</Text>
          <Text className="text-[13px] text-on-surface-variant" numberOfLines={1}>{item.artist}</Text>
          {adder ? (
            <View className="mt-1 flex-row items-center gap-1.5">
              {item.addedByProfileImage ? (
                <Image source={{ uri: item.addedByProfileImage }} style={{ width: 16, height: 16, borderRadius: 8 }} />
              ) : (
                <Ionicons name="person-circle" size={16} color={Colors.onSurfaceVariant} />
              )}
              <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>Added by {adder}</Text>
            </View>
          ) : null}
        </View>
        {hasPreview ? (
          <Ionicons
            name={active && preview.isPlaying ? 'pause-circle' : 'play-circle'}
            size={30}
            color={Colors.primary}
          />
        ) : null}
      </TouchableOpacity>
    )
  }

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
        <View className="mb-1 flex-row items-center gap-3">
          {GLASS ? (
            <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                onPress={() => router.back()}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </GlassView>
          ) : (
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-surface-container"
              onPress={() => router.back()}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={18} color={Colors.onSurface} />
            </TouchableOpacity>
          )}
          <Text className="text-3xl font-extrabold tracking-tighter text-primary" numberOfLines={1}>
            Playlist
          </Text>
        </View>
        <Text className="ml-[52px] text-[14px] font-medium text-on-surface-variant">
          {tracks.length === 1 ? '1 song added' : `${tracks.length} songs added`}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={item => item.trackId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View className="mt-24 items-center px-10">
              <Ionicons name="musical-notes" size={40} color={Colors.onSurfaceVariant} />
              <Text className="mt-3 text-center text-[15px] font-medium text-on-surface-variant">
                No songs added yet
              </Text>
              <Text className="mt-1 text-center text-[13px] text-on-surface-variant">
                Tap “Add to playlist” on any song card in the chat to start building this playlist together.
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}
