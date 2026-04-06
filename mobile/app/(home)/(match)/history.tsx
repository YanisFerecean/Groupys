import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MatchHistoryListItem } from '@/components/match/MatchHistoryListItem'
import { SentLikeListItem } from '@/components/match/SentLikeListItem'
import { Colors } from '@/constants/colors'
import { fetchMatchHistory, fetchSentLikes, withdrawLike } from '@/lib/match-api'
import type { SentLike, UserMatch } from '@/models/Match'

const PAGE_SIZE = 20
const INITIAL_ITEMS_TO_RENDER = 8
const MAX_ITEMS_PER_BATCH = 8
const LIST_WINDOW_SIZE = 7
const LIKES_INITIAL_ITEMS_TO_RENDER = 6
const LIKES_MAX_ITEMS_PER_BATCH = 6
const LIKES_WINDOW_SIZE = 5
const TAB_SWITCHER_PADDING = 3
const TAB_SWITCHER_GAP = 3

type HistoryTab = 'matches' | 'likes'
const HISTORY_TABS: { key: HistoryTab; label: string }[] = [
  { key: 'matches', label: 'Match History' },
  { key: 'likes', label: 'Sent Likes' },
]

function TabSlideTransition({
  transitionKey,
  direction,
  children,
}: {
  transitionKey: string
  direction: 1 | -1
  children: ReactNode
}) {
  const opacity = useRef(new Animated.Value(1)).current
  const translateX = useRef(new Animated.Value(0)).current
  const [renderedKey, setRenderedKey] = useState(transitionKey)
  const [renderedChildren, setRenderedChildren] = useState(children)

  useEffect(() => {
    if (transitionKey === renderedKey) {
      setRenderedChildren(children)
      return
    }

    let cancelled = false
    opacity.stopAnimation()
    translateX.stopAnimation()

    const exitOffset = direction === 1 ? -26 : 26
    const enterOffset = direction === 1 ? 26 : -26

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 110,
        useNativeDriver: false,
      }),
      Animated.timing(translateX, {
        toValue: exitOffset,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (!finished || cancelled) return

      setRenderedKey(transitionKey)
      setRenderedChildren(children)
      translateX.setValue(enterOffset)
      opacity.setValue(0)

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 210,
            useNativeDriver: false,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 230,
            useNativeDriver: false,
          }),
        ]).start()
      })
    })

    return () => {
      cancelled = true
      opacity.stopAnimation()
      translateX.stopAnimation()
    }
  }, [children, direction, opacity, renderedKey, transitionKey, translateX])

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateX }] }}>
      {renderedChildren}
    </Animated.View>
  )
}

function mergeUniqueBy<T>(
  previous: T[],
  incoming: T[],
  getKey: (item: T) => string,
  reset: boolean,
) {
  const merged = reset ? [...incoming] : [...previous, ...incoming]
  const seen = new Set<string>()

  return merged.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export default function MatchHistoryScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const useGlass = isLiquidGlassAvailable()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [activeTab, setActiveTab] = useState<HistoryTab>('matches')
  const [tabDirection, setTabDirection] = useState<1 | -1>(1)
  const [tabBarWidth, setTabBarWidth] = useState(0)
  const tabIndicatorX = useRef(new Animated.Value(0)).current
  const tabIndicatorInitializedRef = useRef(false)

  const [matches, setMatches] = useState<UserMatch[]>([])
  const [matchesPage, setMatchesPage] = useState(0)
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [matchesLoadingMore, setMatchesLoadingMore] = useState(false)
  const [matchesHasMore, setMatchesHasMore] = useState(true)
  const [matchesInitialized, setMatchesInitialized] = useState(false)

  const [likes, setLikes] = useState<SentLike[]>([])
  const [likesPage, setLikesPage] = useState(0)
  const [likesLoading, setLikesLoading] = useState(false)
  const [likesLoadingMore, setLikesLoadingMore] = useState(false)
  const [likesHasMore, setLikesHasMore] = useState(true)
  const [likesInitialized, setLikesInitialized] = useState(false)
  const [withdrawingTargetUserId, setWithdrawingTargetUserId] = useState<string | null>(null)

  getTokenRef.current = getToken

  const loadMatches = useCallback(async (reset = false) => {
    const nextPage = reset ? 0 : matchesPage
    if (reset) {
      setMatchesLoading(true)
    } else {
      if (matchesLoadingMore || !matchesHasMore) {
        return
      }
      setMatchesLoadingMore(true)
    }

    try {
      const token = await getTokenRef.current()
      const data = await fetchMatchHistory(token, nextPage, PAGE_SIZE)
      setMatches((prev) => mergeUniqueBy(prev, data, (match) => match.matchId, reset))
      setMatchesPage(nextPage + 1)
      setMatchesHasMore(data.length === PAGE_SIZE)
    } catch (error) {
      console.error('[match-history] failed to load matches', error)
    } finally {
      setMatchesInitialized(true)
      setMatchesLoading(false)
      setMatchesLoadingMore(false)
    }
  }, [matchesHasMore, matchesLoadingMore, matchesPage])

  const loadLikes = useCallback(async (reset = false) => {
    const nextPage = reset ? 0 : likesPage
    if (reset) {
      setLikesLoading(true)
    } else {
      if (likesLoadingMore || !likesHasMore) {
        return
      }
      setLikesLoadingMore(true)
    }

    try {
      const token = await getTokenRef.current()
      const data = await fetchSentLikes(token, nextPage, PAGE_SIZE)
      setLikes((prev) => mergeUniqueBy(prev, data, (like) => like.targetUserId, reset))
      setLikesPage(nextPage + 1)
      setLikesHasMore(data.length === PAGE_SIZE)
    } catch (error) {
      console.error('[match-history] failed to load sent likes', error)
    } finally {
      setLikesInitialized(true)
      setLikesLoading(false)
      setLikesLoadingMore(false)
    }
  }, [likesHasMore, likesLoadingMore, likesPage])

  useEffect(() => {
    if (!matchesInitialized) {
      void loadMatches(true)
    }
  }, [loadMatches, matchesInitialized])

  useEffect(() => {
    if (activeTab === 'likes' && !likesInitialized) {
      void loadLikes(true)
    }
  }, [activeTab, likesInitialized, loadLikes])

  const tabIndicatorWidth = tabBarWidth > 0
    ? Math.max(0, (tabBarWidth - (TAB_SWITCHER_PADDING * 2) - TAB_SWITCHER_GAP) / HISTORY_TABS.length)
    : 0
  const tabIndicatorTargetX = TAB_SWITCHER_PADDING
    + (activeTab === 'likes' ? tabIndicatorWidth + TAB_SWITCHER_GAP : 0)

  useEffect(() => {
    if (tabIndicatorWidth <= 0) return

    if (!tabIndicatorInitializedRef.current) {
      tabIndicatorX.setValue(tabIndicatorTargetX)
      tabIndicatorInitializedRef.current = true
      return
    }

    Animated.spring(tabIndicatorX, {
      toValue: tabIndicatorTargetX,
      damping: 20,
      mass: 0.8,
      stiffness: 230,
      useNativeDriver: true,
    }).start()
  }, [tabIndicatorTargetX, tabIndicatorWidth, tabIndicatorX])

  const handleTabChange = useCallback((nextTab: HistoryTab) => {
    if (nextTab === activeTab) return
    setTabDirection(nextTab === 'likes' ? 1 : -1)
    setActiveTab(nextTab)
  }, [activeTab])

  const refreshing = activeTab === 'matches' ? matchesLoading : likesLoading
  const loadingMore = activeTab === 'matches' ? matchesLoadingMore : likesLoadingMore
  const hasMore = activeTab === 'matches' ? matchesHasMore : likesHasMore
  const isLikesTab = activeTab === 'likes'

  const initialItemsToRender = isLikesTab
    ? LIKES_INITIAL_ITEMS_TO_RENDER
    : INITIAL_ITEMS_TO_RENDER
  const maxItemsPerBatch = isLikesTab
    ? LIKES_MAX_ITEMS_PER_BATCH
    : MAX_ITEMS_PER_BATCH
  const listWindowSize = isLikesTab ? LIKES_WINDOW_SIZE : LIST_WINDOW_SIZE

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
        <View className="mb-3 flex-row items-center gap-3">
          {useGlass ? (
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
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">
            History
          </Text>
        </View>
        {useGlass ? (
          <GlassView style={{ borderRadius: 18, overflow: 'hidden' }}>
            <View className="px-4 py-3">
              <Text className="text-[15px] font-medium text-on-surface-variant">
                Browse past matches and manage likes you sent before they turned into a match.
              </Text>
            </View>
          </GlassView>
        ) : (
          <Text className="mt-2 text-[15px] font-medium text-on-surface-variant">
            Browse past matches and manage likes you sent before they turned into a match.
          </Text>
        )}
      </View>

      <View className="px-5 pb-4">
        {useGlass ? (
          <GlassView style={{ borderRadius: 999, overflow: 'hidden' }}>
            <View
              onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
              style={{ flexDirection: 'row', padding: TAB_SWITCHER_PADDING, gap: TAB_SWITCHER_GAP, position: 'relative' }}
            >
              {tabIndicatorWidth > 0 ? (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: TAB_SWITCHER_PADDING,
                    bottom: TAB_SWITCHER_PADDING,
                    left: 0,
                    width: tabIndicatorWidth,
                    borderRadius: 999,
                    backgroundColor: `${Colors.primary}1F`,
                    transform: [{ translateX: tabIndicatorX }],
                  }}
                />
              ) : null}
              {HISTORY_TABS.map(({ key, label }) => {
                const active = activeTab === key
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleTabChange(key)}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      paddingVertical: 10,
                      zIndex: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        color: active ? Colors.primary : Colors.onSurfaceVariant,
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </GlassView>
        ) : (
          <View
            onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
            style={{
              flexDirection: 'row',
              backgroundColor: Colors.surfaceContainerLow,
              borderRadius: 999,
              padding: TAB_SWITCHER_PADDING,
              gap: TAB_SWITCHER_GAP,
              position: 'relative',
            }}
          >
            {tabIndicatorWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: TAB_SWITCHER_PADDING,
                  bottom: TAB_SWITCHER_PADDING,
                  left: 0,
                  width: tabIndicatorWidth,
                  borderRadius: 999,
                  backgroundColor: Colors.surface,
                  transform: [{ translateX: tabIndicatorX }],
                }}
              />
            ) : null}
            {HISTORY_TABS.map(({ key, label }) => {
              const active = activeTab === key
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleTabChange(key)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    paddingVertical: 10,
                    zIndex: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      color: active ? Colors.primary : Colors.onSurfaceVariant,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>

      <TabSlideTransition transitionKey={activeTab} direction={tabDirection}>
        <FlatList
          data={activeTab === 'matches' ? matches : likes}
          key={activeTab}
          initialNumToRender={initialItemsToRender}
          maxToRenderPerBatch={maxItemsPerBatch}
          updateCellsBatchingPeriod={60}
          windowSize={listWindowSize}
          removeClippedSubviews
          keyExtractor={(item, index) => activeTab === 'matches'
            ? `${(item as UserMatch).matchId}:${(item as UserMatch).matchedAt}:${index}`
            : `${(item as SentLike).targetUserId}:${(item as SentLike).likedAt}:${index}`}
          renderItem={({ item }) => activeTab === 'matches' ? (
            <MatchHistoryListItem match={item as UserMatch} useGlass={useGlass} />
          ) : (
            <SentLikeListItem
              like={item as SentLike}
              useGlass={useGlass}
              busy={withdrawingTargetUserId === (item as SentLike).targetUserId}
              onWithdraw={() => {
                const targetUserId = (item as SentLike).targetUserId
                setWithdrawingTargetUserId(targetUserId)

                void (async () => {
                  try {
                    const token = await getTokenRef.current()
                    await withdrawLike(targetUserId, token)
                    setLikes((prev) => prev.filter((like) => like.targetUserId !== targetUserId))
                  } catch (error) {
                    console.error('[match-history] failed to withdraw like', error)
                  } finally {
                    setWithdrawingTargetUserId((current) => current === targetUserId ? null : current)
                  }
                })()
              }}
            />
          )}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 36,
          }}
          ListEmptyComponent={(
            <View className="flex-1 items-center justify-center px-10">
              {useGlass ? (
                <GlassView style={{ width: '100%', borderRadius: 24, overflow: 'hidden' }}>
                  <View className="items-center px-8 py-10">
                    {refreshing ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : activeTab === 'matches' ? (
                      <>
                        <Ionicons name="heart-outline" size={42} color={Colors.onSurfaceVariant} />
                        <Text className="mt-4 text-lg font-bold text-on-surface">No match history yet</Text>
                        <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                          When you match with someone, they will appear here even if the connection ends later.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="paper-plane-outline" size={42} color={Colors.onSurfaceVariant} />
                        <Text className="mt-4 text-lg font-bold text-on-surface">No sent likes waiting</Text>
                        <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                          Likes that have not turned into a match yet will show up here, and you can remove them.
                        </Text>
                      </>
                    )}
                  </View>
                </GlassView>
              ) : refreshing ? (
                <ActivityIndicator color={Colors.primary} />
              ) : activeTab === 'matches' ? (
                <>
                  <Ionicons name="heart-outline" size={42} color={Colors.onSurfaceVariant} />
                  <Text className="mt-4 text-lg font-bold text-on-surface">No match history yet</Text>
                  <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                    When you match with someone, they will appear here even if the connection ends later.
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={42} color={Colors.onSurfaceVariant} />
                  <Text className="mt-4 text-lg font-bold text-on-surface">No sent likes waiting</Text>
                  <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                    Likes that have not turned into a match yet will show up here, and you can remove them.
                  </Text>
                </>
              )}
            </View>
          )}
          ListFooterComponent={loadingMore ? (
            <View className="py-4">
              {useGlass ? (
                <View className="items-center">
                  <GlassView style={{ borderRadius: 999, overflow: 'hidden' }}>
                    <View className="px-5 py-2.5">
                      <ActivityIndicator color={Colors.primary} />
                    </View>
                  </GlassView>
                </View>
              ) : (
                <ActivityIndicator color={Colors.primary} />
              )}
            </View>
          ) : null}
          onEndReached={() => {
            if (!hasMore || loadingMore) {
              return
            }

            if (activeTab === 'matches') {
              void loadMatches(false)
            } else {
              void loadLikes(false)
            }
          }}
          onEndReachedThreshold={0.35}
          onRefresh={() => {
            if (activeTab === 'matches') {
              void loadMatches(true)
            } else {
              void loadLikes(true)
            }
          }}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      </TabSlideTransition>
    </View>
  )
}
