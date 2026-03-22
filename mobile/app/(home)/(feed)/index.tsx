import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FeedPostCard from '@/components/feed/FeedPostCard'
import { apiFetch } from '@/lib/api'
import { Colors } from '@/constants/colors'
import type { PostResDto } from '@/models/PostRes'
import type { CommunityResDto } from '@/models/CommunityRes'

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  const [posts, setPosts] = useState<PostResDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchFeed = useCallback(async () => {
    try {
      const token = await getToken()
      const data = await apiFetch<PostResDto[]>('/posts/feed', token)
      setPosts(data)
    } catch (err) {
      console.error('Failed to fetch feed:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchFeed()
  }, [fetchFeed])

  const handlePostUpdated = useCallback((updated: PostResDto) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])



  const renderPost = useCallback(
    ({ item }: { item: PostResDto }) => (
      <FeedPostCard
        post={item}
        onPostUpdated={handlePostUpdated}
        communityRoute="/(home)/(feed)/community"
        postRoute="/(home)/(feed)/post"
      />
    ),
    [handlePostUpdated],
  )

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Text className="text-4xl font-extrabold tracking-tighter text-primary">
          Feed
        </Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="people-outline" size={48} color={Colors.onSurfaceVariant} />
          <Text className="text-on-surface font-bold text-lg mt-3">No posts yet</Text>
          <Text className="text-on-surface-variant text-sm text-center mt-1">
            Join some communities to see their posts in your feed.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

    </View>
  )
}
