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
  const [viewportH, setViewportH] = useState(0)

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

  // NOTE: do not clear `visiblePostIds` on blur. Playback is already gated by
  // `isScreenFocused` (so video pauses when the comments sheet / another screen
  // opens). Clearing here left the set empty on return — and since the
  // viewability callback only fires on scroll, the video never resumed.

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
        commentsRoute="/(home)/(feed)/comments"
        height={viewportH}
        isActive={isScreenFocused && Boolean(visiblePostIds[item.id])}
      />
    ),
    [handlePostUpdated, isScreenFocused, visiblePostIds, viewportH],
  )

  const renderEmptyState = useCallback(
    () => (
      <View className="items-center justify-center px-10">
        <Ionicons name="people-outline" size={48} color="#ffffff" />
        <Text className="text-white font-bold text-lg mt-3">No posts yet</Text>
        <Text className="text-white/70 text-sm text-center mt-1">
          Join some communities to see their posts in your feed.
        </Text>
      </View>
    ),
    [],
  )

  return (
    <SwipeableTabScreen tab="(feed)">
      <View
        className="flex-1 bg-black"
        onLayout={(event) => {
          const measured = Math.round(event.nativeEvent.layout.height)
          if (measured > 0 && measured !== viewportH) {
            setViewportH(measured)
          }
        }}
      >
        {loading || viewportH === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={viewportH}
            snapToAlignment="start"
            disableIntervalMomentum
            getItemLayout={(_, index) => ({
              length: viewportH,
              offset: viewportH * index,
              index,
            })}
            contentContainerStyle={isEmpty ? { flexGrow: 1, justifyContent: 'center' } : undefined}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            removeClippedSubviews
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

        {/* Brand wordmark — overlaid, does not steal layout height */}
        <View
          pointerEvents="none"
          className="absolute left-5 right-5 flex-row items-center"
          style={{ top: insets.top + 8 }}
        >
          <Text
            className="text-3xl font-extrabold tracking-tighter text-white"
            style={{ textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}
          >
            Groupys
          </Text>
        </View>
      </View>
    </SwipeableTabScreen>
  )
}
