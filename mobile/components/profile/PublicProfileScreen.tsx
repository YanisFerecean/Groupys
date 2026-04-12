import FeedPostCard from '@/components/feed/FeedPostCard'
import ProfileHeader from '@/components/profile/ProfileHeader'
import CurrentlyListeningWidget from '@/components/profile/widgets/CurrentlyListeningWidget'
import TopAlbumsWidget from '@/components/profile/widgets/TopAlbumsWidget'
import TopArtistsWidget from '@/components/profile/widgets/TopArtistsWidget'
import TopSongsWidget from '@/components/profile/widgets/TopSongsWidget'
import { Colors } from '@/constants/colors'
import { useAuthToken } from '@/hooks/useAuthToken'
import { useChat } from '@/hooks/useChat'
import { useTopMusic } from '@/hooks/useTopMusic'
import {
  backendUserToProfile,
  fetchAlbumRatingsByUsername,
  fetchPostsByAuthor,
  fetchUserById,
  type BackendUser,
} from '@/lib/api'
import type { PostResDto } from '@/models/PostRes'
import { Ionicons } from '@expo/vector-icons'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { router, useSegments } from 'expo-router'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@clerk/expo'
import { communityBasePath, homeTabRootPath, postBasePath, resolveHomeTab } from '@/lib/profileRoutes'

const DEFAULT_WIDGET_ORDER = ['topAlbums', 'currentlyListening', 'topSongs', 'topArtists'] as const
type ProfileContentTab = 'widgets' | 'posts'
const TAB_SWITCHER_PADDING = 3
const TAB_SWITCHER_GAP = 3

const PROFILE_CONTENT_TABS: { key: ProfileContentTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'widgets', label: 'Widgets', icon: 'apps-outline' },
  { key: 'posts', label: 'Posts', icon: 'document-text-outline' },
]

interface PublicProfileScreenProps {
  userId: string
}

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

  return <Animated.View style={{ opacity, transform: [{ translateX }] }}>{renderedChildren}</Animated.View>
}

export default function PublicProfileScreen({ userId }: PublicProfileScreenProps) {
  const insets = useSafeAreaInsets()
  const segments = useSegments()
  const currentTab = resolveHomeTab(segments, '(profile)')
  const useGlass = isLiquidGlassAvailable()
  const { user } = useUser()
  const { refreshToken } = useAuthToken()
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null)
  const [posts, setPosts] = useState<PostResDto[]>([])
  const [ratedAlbumsCount, setRatedAlbumsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [messagingLoading, setMessagingLoading] = useState(false)
  const [contentTab, setContentTab] = useState<ProfileContentTab>('widgets')
  const [contentTabDirection, setContentTabDirection] = useState<1 | -1>(1)
  const [tabBarWidth, setTabBarWidth] = useState(0)
  const tabIndicatorX = useRef(new Animated.Value(0)).current
  const tabIndicatorInitializedRef = useRef(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const token = await refreshToken()
      if (!token) {
        setBackendUser(null)
        setRatedAlbumsCount(0)
        return
      }

      const [profileData, postsData] = await Promise.all([
        fetchUserById(userId, token),
        fetchPostsByAuthor(userId, token),
      ])

      if (profileData?.clerkId === user?.id) {
        router.replace(homeTabRootPath('(profile)') as any)
        return
      }

      setBackendUser(profileData)
      setPosts(postsData)

      if (profileData?.username) {
        const ratingsData = await fetchAlbumRatingsByUsername(profileData.username, token).catch(() => [])
        setRatedAlbumsCount(ratingsData.length)
      } else {
        setRatedAlbumsCount(0)
      }
    } catch (error) {
      console.error('Failed to load public profile:', error)
      setBackendUser(null)
      setPosts([])
      setRatedAlbumsCount(0)
    } finally {
      setLoading(false)
    }
  }, [refreshToken, user?.id, userId])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const profile = useMemo(
    () => (backendUser ? backendUserToProfile(backendUser) : null),
    [backendUser],
  )

  const { conversations, startDirectConversation } = useChat()

  const existingConversation = useMemo(() => {
    if (!backendUser) return null
    return conversations.find(c => c.participants.some(p => p.userId === backendUser.id)) ?? null
  }, [conversations, backendUser])

  const messageButtonLabel = useMemo(() => {
    switch (existingConversation?.requestStatus) {
      case 'ACCEPTED': return 'Message'
      case 'PENDING_OUTGOING': return 'Requested'
      case 'PENDING_INCOMING': return 'Respond to Request'
      default: return 'Message'
    }
  }, [existingConversation])

  const handleMessagePress = useCallback(async () => {
    if (!backendUser) return

    if (existingConversation?.requestStatus === 'ACCEPTED' || existingConversation?.requestStatus === 'PENDING_INCOMING') {
      router.push(`/(home)/(match)/chat/${existingConversation.id}` as never)
      return
    }

    if (existingConversation?.requestStatus === 'PENDING_OUTGOING') return

    setMessagingLoading(true)
    try {
      const conversation = await startDirectConversation(backendUser.id)
      if (conversation.requestStatus === 'ACCEPTED') {
        router.push(`/(home)/(match)/chat/${conversation.id}` as never)
      }
    } catch (error) {
      console.error('[profile] failed to start conversation', error)
    } finally {
      setMessagingLoading(false)
    }
  }, [backendUser, existingConversation, startDirectConversation])

  const { topMusic } = useTopMusic({
    targetUserId: backendUser?.id,
    musicConnected: profile?.musicConnected ?? profile?.spotifyConnected,
    syncTopAlbumsWithMusic: profile?.syncTopAlbumsWithMusic ?? profile?.syncTopAlbumsWithSpotify,
    syncTopSongsWithMusic: profile?.syncTopSongsWithMusic ?? profile?.syncTopSongsWithSpotify,
    syncTopArtistsWithMusic: profile?.syncTopArtistsWithMusic ?? profile?.syncTopArtistsWithSpotify,
  })

  const isMusicConnected = profile?.musicConnected ?? profile?.spotifyConnected
  const syncTopAlbumsWithMusic = profile?.syncTopAlbumsWithMusic ?? profile?.syncTopAlbumsWithSpotify
  const syncTopSongsWithMusic = profile?.syncTopSongsWithMusic ?? profile?.syncTopSongsWithSpotify
  const syncTopArtistsWithMusic = profile?.syncTopArtistsWithMusic ?? profile?.syncTopArtistsWithSpotify

  const topAlbums = syncTopAlbumsWithMusic && isMusicConnected
    ? topMusic.topAlbums
    : profile?.topAlbums
  const topSongs = syncTopSongsWithMusic && isMusicConnected
    ? topMusic.topSongs
    : profile?.topSongs
  const topArtists = syncTopArtistsWithMusic && isMusicConnected
    ? topMusic.topArtists
    : profile?.topArtists

  const activeTabIndex = PROFILE_CONTENT_TABS.findIndex(({ key }) => key === contentTab)
  const tabIndicatorWidth = tabBarWidth > 0
    ? Math.max(
      0,
      (tabBarWidth - (TAB_SWITCHER_PADDING * 2) - (TAB_SWITCHER_GAP * (PROFILE_CONTENT_TABS.length - 1)))
      / PROFILE_CONTENT_TABS.length,
    )
    : 0
  const tabIndicatorTargetX = TAB_SWITCHER_PADDING + activeTabIndex * (tabIndicatorWidth + TAB_SWITCHER_GAP)

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

  const handleContentTabChange = useCallback(
    (nextTab: ProfileContentTab) => {
      if (nextTab === contentTab) return
      setContentTabDirection(nextTab === 'posts' ? 1 : -1)
      setContentTab(nextTab)
    },
    [contentTab],
  )

  const orderedWidgets = useMemo(() => {
    if (!profile) {
      return []
    }

    const widgetOrder = profile.widgetOrder?.length
      ? [...profile.widgetOrder, ...DEFAULT_WIDGET_ORDER.filter(type => !profile.widgetOrder?.includes(type))]
      : [...DEFAULT_WIDGET_ORDER]
    const hiddenWidgets = new Set(profile.hiddenWidgets ?? [])

    return widgetOrder.flatMap((type) => {
      if (hiddenWidgets.has(type)) {
        return []
      }

      switch (type) {
        case 'currentlyListening':
          return profile.currentlyListening?.title || isMusicConnected
            ? [
                <CurrentlyListeningWidget
                  key={type}
                  track={profile.currentlyListening}
                  musicConnected={isMusicConnected}
                  musicUserId={backendUser?.id}
                />,
              ]
            : []
        case 'topAlbums':
          return topAlbums?.length
            ? [
                <TopAlbumsWidget
                  key={type}
                  albums={topAlbums}
                  containerColor={profile.albumsContainerColor}
                  textColor={profile.accentColor}
                  size={profile.widgetSizes?.topAlbums}
                />,
              ]
            : []
        case 'topSongs':
          return topSongs?.length
            ? [
                <TopSongsWidget
                  key={type}
                  songs={topSongs}
                  containerColor={profile.songsContainerColor}
                  textColor={profile.accentColor}
                  size={profile.widgetSizes?.topSongs}
                />,
              ]
            : []
        case 'topArtists':
          return topArtists?.length
            ? [
                <TopArtistsWidget
                  key={type}
                  artists={topArtists}
                  containerColor={profile.artistsContainerColor}
                  textColor={profile.accentColor}
                  size={profile.widgetSizes?.topArtists}
                />,
              ]
            : []
        default:
          return []
      }
    })
  }, [backendUser?.id, isMusicConnected, profile, topAlbums, topArtists, topSongs])
  const hasWidgets = orderedWidgets.length > 0

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!backendUser || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-10">
        <Ionicons name="person-circle-outline" size={44} color={Colors.primary} />
        <Text className="mt-3 text-lg font-bold text-on-surface">Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="font-semibold text-primary">Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const displayName = profile.displayName ?? backendUser.displayName ?? backendUser.username
  const username = backendUser.username

  return (
    <View className="flex-1 bg-surface">
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 20,
          zIndex: 10,
          paddingTop: insets.top + 8,
        }}
      >
        {useGlass ? (
          <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full"
            >
              <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface-container"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profile={profile}
          avatarUrl={backendUser.profileImage}
          displayName={displayName}
          username={username}
          memberYear={backendUser.dateJoined}
          communitiesCount={0}
          postsCount={posts.length}
          followingCount={profile.followingCount}
          followersCount={profile.followersCount}
          ratedAlbumsCount={ratedAlbumsCount}
          onRatedAlbumsPress={() => {
            router.push({
              pathname: '/(home)/(profile)/rated-albums',
              params: { username, displayName },
            } as never)
          }}
          onEditPress={() => undefined}
        />

        <View className="px-5 pt-4">
          {useGlass ? (
            <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
              <TouchableOpacity
                onPress={handleMessagePress}
                disabled={messagingLoading || existingConversation?.requestStatus === 'PENDING_OUTGOING'}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  opacity: existingConversation?.requestStatus === 'PENDING_OUTGOING' ? 0.5 : 1,
                }}
              >
                {messagingLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={existingConversation?.requestStatus === 'PENDING_OUTGOING' ? 'time-outline' : 'chatbubble-ellipses-outline'}
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.primary }}>
                      {messageButtonLabel}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </GlassView>
          ) : (
            <TouchableOpacity
              onPress={handleMessagePress}
              disabled={messagingLoading || existingConversation?.requestStatus === 'PENDING_OUTGOING'}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 999,
                paddingVertical: 12,
                paddingHorizontal: 20,
                backgroundColor: Colors.surfaceContainerLow,
                borderWidth: 1,
                borderColor: Colors.outlineVariant,
                opacity: existingConversation?.requestStatus === 'PENDING_OUTGOING' ? 0.5 : 1,
              }}
            >
              {messagingLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name={existingConversation?.requestStatus === 'PENDING_OUTGOING' ? 'time-outline' : 'chatbubble-ellipses-outline'}
                    size={18}
                    color={Colors.primary}
                  />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.primary }}>
                    {messageButtonLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View className="px-5 pt-5">
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
                {PROFILE_CONTENT_TABS.map(({ key, label, icon }) => {
                  const active = contentTab === key
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handleContentTabChange(key)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        borderRadius: 999,
                        paddingVertical: 10,
                        zIndex: 1,
                      }}
                    >
                      <Ionicons
                        name={icon}
                        size={16}
                        color={active ? Colors.primary : Colors.onSurfaceVariant}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
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
              {PROFILE_CONTENT_TABS.map(({ key, label, icon }) => {
                const active = contentTab === key
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleContentTabChange(key)}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderRadius: 999,
                      paddingVertical: 10,
                      zIndex: 1,
                    }}
                  >
                    <Ionicons
                      name={icon}
                      size={16}
                      color={active ? Colors.primary : Colors.onSurfaceVariant}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
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

        <TabSlideTransition transitionKey={contentTab} direction={contentTabDirection}>
          {contentTab === 'widgets' ? (
            <>
              {hasWidgets ? (
                <View className="gap-6 px-5 pt-6">{orderedWidgets}</View>
              ) : (
                <View className="items-center px-6 pt-10">
                  <View className="w-full items-center gap-3 rounded-[32px] border border-black/5 bg-surface-container-lowest p-8">
                    <View className="mb-1 h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
                      <Ionicons name="musical-notes" size={28} color={Colors.onSurfaceVariant} />
                    </View>
                    <Text className="text-center text-[20px] font-bold tracking-tight text-on-surface">
                      No Music Added
                    </Text>
                    <Text className="max-w-[90%] text-center text-[15px] leading-6 text-on-surface-variant">
                      {displayName} hasn&apos;t added featured music to this profile yet.
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View className="px-6 pb-4 pt-6">
              <View className="mb-5 flex-row items-center justify-between">
                <Text className="text-[22px] font-bold tracking-tight text-on-surface">
                  Posts
                  {posts.length > 0 ? (
                    <Text className="text-[16px] font-medium text-on-surface-variant">   {posts.length}</Text>
                  ) : null}
                </Text>
              </View>

              {posts.length === 0 ? (
                <View className="items-center gap-3 rounded-[32px] border border-black/5 bg-surface-container-lowest py-14">
                  <View className="mb-1 h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
                    <Ionicons name="document-text" size={28} color={Colors.onSurfaceVariant} />
                  </View>
                  <Text className="text-[20px] font-bold tracking-tight text-on-surface">No Posts Yet</Text>
                  <Text className="max-w-[80%] text-center text-[15px] leading-6 text-on-surface-variant">
                    When {displayName} shares with communities, those posts will appear here.
                  </Text>
                </View>
              ) : (
                <View>
                  {posts.map((post) => (
                    <FeedPostCard
                      key={post.id}
                      post={post}
                      onPostUpdated={(updated) => {
                        setPosts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
                      }}
                      communityRoute={communityBasePath(currentTab)}
                      postRoute={postBasePath(currentTab)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </TabSlideTransition>
      </ScrollView>
    </View>
  )
}
