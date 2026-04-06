import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useIsFocused } from '@react-navigation/native'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
  type ViewToken,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FeedPostCard from '@/components/feed/FeedPostCard'
import SwipeableTabScreen from '@/components/navigation/SwipeableTabScreen'
import { apiFetch } from '@/lib/api'
import { Colors } from '@/constants/colors'
import type { PostResDto } from '@/models/PostRes'

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const isScreenFocused = useIsFocused()
  const { getToken, isLoaded: isAuthLoaded } = useAuth()
  const getTokenRef = useRef(getToken)
  const [posts, setPosts] = useState<PostResDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [visiblePostIds, setVisiblePostIds] = useState<Record<string, true>>({})

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextVisible: Record<string, true> = {}
      viewableItems.forEach((viewToken) => {
        if (!viewToken.isViewable) return
        const candidate = viewToken.item as { id?: string } | null
        const id = candidate?.id ?? (typeof viewToken.key === 'string' ? viewToken.key : null)
        if (id) {
          nextVisible[id] = true
        }
      })
      setVisiblePostIds(nextVisible)
    },
  ).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 120,
  }).current

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const fetchFeed = useCallback(async () => {
    try {
      const token = await getTokenRef.current()
      const data = await apiFetch<PostResDto[]>('/posts/feed', token)
      setPosts(data)
    } catch (err) {
      console.error('Failed to fetch feed:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthLoaded) return
    fetchFeed()
  }, [isAuthLoaded, fetchFeed])

  useEffect(() => {
    if (!isScreenFocused) {
      setVisiblePostIds({})
    }
  }, [isScreenFocused])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchFeed()
  }, [fetchFeed])

  const handlePostUpdated = useCallback((updated: PostResDto) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  const isEmpty = posts.length === 0

  const renderPost = useCallback(
    ({ item }: { item: PostResDto }) => (
      <FeedPostCard
        post={item}
        onPostUpdated={handlePostUpdated}
        communityRoute="/(home)/(feed)/community"
        postRoute="/(home)/(feed)/post"
        isActive={isScreenFocused && Boolean(visiblePostIds[item.id])}
      />
    ),
    [handlePostUpdated, isScreenFocused, visiblePostIds],
  )

  const renderEmptyState = useCallback(
    () => (
      <View className="items-center justify-center px-10">
        <Ionicons name="people-outline" size={48} color={Colors.onSurfaceVariant} />
        <Text className="text-on-surface font-bold text-lg mt-3">No posts yet</Text>
        <Text className="text-on-surface-variant text-sm text-center mt-1">
          Join some communities to see their posts in your feed.
        </Text>
      </View>
    ),
    [],
  )

  return (
    <SwipeableTabScreen tab="(feed)">
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View
          className="flex-row items-center px-5"
          style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
        >
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">
            Groupys
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: isEmpty ? 0 : 16,
              paddingBottom: 100,
              justifyContent: isEmpty ? 'center' : 'flex-start',
            }}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            refreshControl={(
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            )}
          />
        )}
      </View>
    </SwipeableTabScreen>
  )
}
