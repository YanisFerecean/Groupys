import FeedPostCard from '@/components/feed/FeedPostCard'
import ProfileHeader from '@/components/profile/ProfileHeader'
import CurrentlyListeningWidget from '@/components/profile/widgets/CurrentlyListeningWidget'
import TopAlbumsWidget from '@/components/profile/widgets/TopAlbumsWidget'
import TopArtistsWidget from '@/components/profile/widgets/TopArtistsWidget'
import TopSongsWidget from '@/components/profile/widgets/TopSongsWidget'
import AlbumRatingModal from '@/components/album/AlbumRatingModal'
import SwipeableTabScreen from '@/components/navigation/SwipeableTabScreen'
import { Colors } from '@/constants/colors'
import { useProfileCustomization } from '@/hooks/useProfileCustomization'
import { useTopMusic } from '@/hooks/useTopMusic'
import { apiFetch, fetchMyPosts, fetchMyAlbumRatings } from '@/lib/api'
import type { CommunityResDto } from '@/models/CommunityRes'
import type { PostResDto } from '@/models/PostRes'
import type { TopAlbum } from '@/models/ProfileCustomization'
import { useAuth, useUser } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { SymbolView } from 'expo-symbols'
import { useRouter, useFocusEffect } from 'expo-router'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const DEFAULT_WIDGET_ORDER = ['topAlbums', 'currentlyListening', 'topSongs', 'topArtists'] as const
type ResizableWidgetType = 'topAlbums' | 'topSongs' | 'topArtists'
type WidgetSize = 'small' | 'normal'
type ProfileContentTab = 'widgets' | 'posts'
const TAB_SWITCHER_PADDING = 3
const TAB_SWITCHER_GAP = 3

const PROFILE_CONTENT_TABS: { key: ProfileContentTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'widgets', label: 'Widgets', icon: 'apps-outline' },
  { key: 'posts', label: 'Posts', icon: 'document-text-outline' },
]

function WidgetFadeTransition({
  transitionKey,
  children,
}: {
  transitionKey: string
  children: ReactNode
}) {
  const opacity = useRef(new Animated.Value(1)).current
  const [renderedKey, setRenderedKey] = useState(transitionKey)
  const [renderedChildren, setRenderedChildren] = useState(children)

  useEffect(() => {
    if (transitionKey === renderedKey) {
      setRenderedChildren(children)
      return
    }

    let cancelled = false

    Animated.timing(opacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || cancelled) return

      setRenderedKey(transitionKey)
      setRenderedChildren(children)

      requestAnimationFrame(() => {
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start()
      })
    })

    return () => {
      cancelled = true
      opacity.stopAnimation()
    }
  }, [children, opacity, renderedKey, transitionKey])

  return <Animated.View style={{ opacity }}>{renderedChildren}</Animated.View>
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()
  const { profile, backendUser, updateProfile, refreshProfile, isLoaded } = useProfileCustomization()
  const { topMusic } = useTopMusic({
    musicConnected: profile.musicConnected ?? profile.spotifyConnected,
    syncTopAlbumsWithMusic: profile.syncTopAlbumsWithMusic ?? profile.syncTopAlbumsWithSpotify,
    syncTopSongsWithMusic: profile.syncTopSongsWithMusic ?? profile.syncTopSongsWithSpotify,
    syncTopArtistsWithMusic: profile.syncTopArtistsWithMusic ?? profile.syncTopArtistsWithSpotify,
  })
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [ratingAlbum, setRatingAlbum] = useState<TopAlbum | null>(null)
  const [myRatingScores, setMyRatingScores] = useState<Record<number, number>>({})
  const [contentTab, setContentTab] = useState<ProfileContentTab>('widgets')
  const [contentTabDirection, setContentTabDirection] = useState<1 | -1>(1)
  const [tabBarWidth, setTabBarWidth] = useState(0)
  const tabIndicatorX = useRef(new Animated.Value(0)).current
  const tabIndicatorInitializedRef = useRef(false)

  // My posts
  const [myPosts, setMyPosts] = useState<PostResDto[]>([])
  const [joinedCommunitiesCount, setJoinedCommunitiesCount] = useState(0)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [postSearch, setPostSearch] = useState('')
  const [postMediaFilter, setPostMediaFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [postSort, setPostSort] = useState<'newest' | 'oldest' | 'top'>('newest')
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    if (!isLoaded) return
    const fetchPosts = async () => {
      try {
        const token = await getTokenRef.current()
        if (!token) return
        const [postsData, myCommunities] = await Promise.all([
          fetchMyPosts(token),
          apiFetch<CommunityResDto[]>('/communities/mine', token).catch(() => [] as CommunityResDto[]),
        ])
        setMyPosts(postsData)
        setJoinedCommunitiesCount(myCommunities.length)
      } catch (err) {
        console.error('Failed to fetch my posts:', err)
      } finally {
        setLoadingPosts(false)
      }
    }
    fetchPosts()
  }, [isLoaded])

  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) return

      void refreshProfile()

      const loadRatingScores = async () => {
        try {
          const token = await getTokenRef.current()
          if (!token) return
          const ratings = await fetchMyAlbumRatings(token)
          const scoreMap: Record<number, number> = {}
          for (const r of ratings) {
            scoreMap[r.albumId] = r.score
          }
          setMyRatingScores(scoreMap)
        } catch {
          // non-critical
        }
      }
      void loadRatingScores()
    }, [isLoaded, refreshProfile])
  )

  const filteredPosts = useMemo(() => {
    let posts = myPosts

    if (postSearch.trim()) {
      const q = postSearch.trim().toLowerCase()
      posts = posts.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.communityName.toLowerCase().includes(q)
      )
    }

    if (postMediaFilter !== 'all') {
      posts = posts.filter((p) => {
        if (postMediaFilter === 'photo') return p.media.some((m) => m.type.startsWith('image'))
        if (postMediaFilter === 'video') return p.media.some((m) => m.type.startsWith('video'))
        return true
      })
    }

    return [...posts].sort((a, b) => {
      if (postSort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (postSort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return b.likeCount - a.likeCount
    })
  }, [myPosts, postSearch, postMediaFilter, postSort])

  const openEditProfileSheet = useCallback(() => {
    router.push('/(home)/(profile)/edit-profile')
  }, [router])
  const handleWidgetSizeChange = useCallback(
    async (type: ResizableWidgetType, size: WidgetSize) => {
      await updateProfile({
        ...profile,
        widgetSizes: {
          ...(profile.widgetSizes ?? {}),
          [type]: size,
        },
      })
    },
    [profile, updateProfile],
  )

  const displayName =
    profile.displayName ?? user?.fullName ?? user?.username ?? 'Music Fan'
  const username = backendUser?.username ?? user?.username ?? ''
  const memberYear = backendUser?.dateJoined
    ? backendUser.dateJoined
    : user?.createdAt
      ? user.createdAt.toISOString()
      : undefined

  const isMusicConnected = profile.musicConnected ?? profile.spotifyConnected
  const syncTopAlbumsWithMusic = profile.syncTopAlbumsWithMusic ?? profile.syncTopAlbumsWithSpotify
  const syncTopSongsWithMusic = profile.syncTopSongsWithMusic ?? profile.syncTopSongsWithSpotify
  const syncTopArtistsWithMusic = profile.syncTopArtistsWithMusic ?? profile.syncTopArtistsWithSpotify

  const topAlbums = syncTopAlbumsWithMusic && isMusicConnected
    ? topMusic.topAlbums
    : profile.topAlbums
  const topSongs = syncTopSongsWithMusic && isMusicConnected
    ? topMusic.topSongs
    : profile.topSongs
  const topArtists = syncTopArtistsWithMusic && isMusicConnected
    ? topMusic.topArtists
    : profile.topArtists
  const orderedWidgets = useMemo(() => {
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
                />,
              ]
            : []
        case 'topAlbums':
          return topAlbums?.length
            ? [
                <View key={type} className="relative">
                  <View className="absolute z-20" style={{ right: 12, top: 12 }}>
                    {isLiquidGlassAvailable() ? (
                      <GlassView isInteractive style={{ borderRadius: 20 }}>
                        <TouchableOpacity
                          onPress={() => {
                            const current = profile.widgetSizes?.topAlbums ?? 'normal'
                            const next = current === 'small' ? 'normal' : 'small'
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            void handleWidgetSizeChange('topAlbums', next)
                          }}
                          style={{ padding: 6 }}
                          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          activeOpacity={0.7}
                        >
                          <SymbolView
                            name={profile.widgetSizes?.topAlbums === 'small' ? 'square' : 'square.grid.2x2'}
                            size={16}
                            tintColor={Colors.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                      </GlassView>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          const current = profile.widgetSizes?.topAlbums ?? 'normal'
                          const next = current === 'small' ? 'normal' : 'small'
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          void handleWidgetSizeChange('topAlbums', next)
                        }}
                        className="h-8 w-8 items-center justify-center"
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        activeOpacity={0.7}
                      >
                        <SymbolView
                          name={profile.widgetSizes?.topAlbums === 'small' ? 'square' : 'square.grid.2x2'}
                          size={16}
                          tintColor={Colors.onSurfaceVariant}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <WidgetFadeTransition transitionKey={profile.widgetSizes?.topAlbums ?? 'normal'}>
                    <TopAlbumsWidget
                      albums={topAlbums}
                      containerColor={profile.albumsContainerColor}
                      textColor={profile.accentColor}
                      size={profile.widgetSizes?.topAlbums}
                      onAlbumPress={(album) => { if (album.id) setRatingAlbum(album) }}
                      userRatingScores={myRatingScores}
                    />
                  </WidgetFadeTransition>
                </View>,
              ]
            : []
        case 'topSongs':
          return topSongs?.length
            ? [
                <View key={type} className="relative">
                  <View className="absolute z-20" style={{ right: 12, top: 12 }}>
                    {isLiquidGlassAvailable() ? (
                      <GlassView isInteractive style={{ borderRadius: 20 }}>
                        <TouchableOpacity
                          onPress={() => {
                            const current = profile.widgetSizes?.topSongs ?? 'normal'
                            const next = current === 'small' ? 'normal' : 'small'
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            void handleWidgetSizeChange('topSongs', next)
                          }}
                          style={{ padding: 6 }}
                          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          activeOpacity={0.7}
                        >
                          <SymbolView
                            name={profile.widgetSizes?.topSongs === 'small' ? 'square' : 'square.grid.2x2'}
                            size={16}
                            tintColor={Colors.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                      </GlassView>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          const current = profile.widgetSizes?.topSongs ?? 'normal'
                          const next = current === 'small' ? 'normal' : 'small'
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          void handleWidgetSizeChange('topSongs', next)
                        }}
                        className="h-8 w-8 items-center justify-center"
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        activeOpacity={0.7}
                      >
                        <SymbolView
                          name={profile.widgetSizes?.topSongs === 'small' ? 'square' : 'square.grid.2x2'}
                          size={16}
                          tintColor={Colors.onSurfaceVariant}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TopSongsWidget
                    key={`topSongs-${profile.widgetSizes?.topSongs ?? 'normal'}`}
                    songs={topSongs}
                    containerColor={profile.songsContainerColor}
                    textColor={profile.accentColor}
                    size={profile.widgetSizes?.topSongs}
                  />
                </View>,
              ]
            : []
        case 'topArtists':
          return topArtists?.length
            ? [
                <View key={type} className="relative">
                  <View className="absolute z-20" style={{ right: 12, top: 12 }}>
                    {isLiquidGlassAvailable() ? (
                      <GlassView isInteractive style={{ borderRadius: 20 }}>
                        <TouchableOpacity
                          onPress={() => {
                            const current = profile.widgetSizes?.topArtists ?? 'normal'
                            const next = current === 'small' ? 'normal' : 'small'
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            void handleWidgetSizeChange('topArtists', next)
                          }}
                          style={{ padding: 6 }}
                          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          activeOpacity={0.7}
                        >
                          <SymbolView
                            name={profile.widgetSizes?.topArtists === 'small' ? 'square' : 'square.grid.2x2'}
                            size={16}
                            tintColor={Colors.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                      </GlassView>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          const current = profile.widgetSizes?.topArtists ?? 'normal'
                          const next = current === 'small' ? 'normal' : 'small'
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          void handleWidgetSizeChange('topArtists', next)
                        }}
                        className="h-8 w-8 items-center justify-center"
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        activeOpacity={0.7}
                      >
                        <SymbolView
                          name={profile.widgetSizes?.topArtists === 'small' ? 'square' : 'square.grid.2x2'}
                          size={16}
                          tintColor={Colors.onSurfaceVariant}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <WidgetFadeTransition transitionKey={profile.widgetSizes?.topArtists ?? 'normal'}>
                    <TopArtistsWidget
                      artists={topArtists}
                      containerColor={profile.artistsContainerColor}
                      textColor={profile.accentColor}
                      size={profile.widgetSizes?.topArtists}
                    />
                  </WidgetFadeTransition>
                </View>,
              ]
            : []
        default:
          return []
      }
    })
  }, [
    profile.accentColor,
    profile.albumsContainerColor,
    profile.artistsContainerColor,
    profile.currentlyListening,
    profile.hiddenWidgets,
    profile.songsContainerColor,
    profile.widgetOrder,
    profile.widgetSizes,
    isMusicConnected,
    topAlbums,
    topArtists,
    topSongs,
    myRatingScores,
  ])
  const hasWidgets = orderedWidgets.length > 0
  const activeTabIndex = Math.max(0, PROFILE_CONTENT_TABS.findIndex((tab) => tab.key === contentTab))
  const tabIndicatorWidth = tabBarWidth > 0
    ? Math.max(
      0,
      (tabBarWidth - TAB_SWITCHER_PADDING * 2 - TAB_SWITCHER_GAP * (PROFILE_CONTENT_TABS.length - 1))
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

  async function handleAvatarPress() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    })

    if (result.canceled || !result.assets?.[0]?.uri) return

    setIsUploadingAvatar(true)
    try {
      const asset = result.assets[0]
      // On React Native, fetch().blob() loses the MIME type (returns text/plain).
      // Instead, build a file-like object with explicit type — RN's multipart
      // encoder will read the uri directly with the correct content-type.
      const filename = asset.uri.split('/').pop() ?? 'avatar.jpg'
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'

      const file = {
        uri: asset.uri,
        type: mimeType,
        name: filename,
      } as unknown as Blob

      await user?.setProfileImage({ file })
    } catch (e) {
      console.error('Avatar upload failed:', e)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  return (
    <SwipeableTabScreen tab="(profile)">
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
        >
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">Groupys</Text>
          <View className="flex-row items-center gap-3">
            {isLiquidGlassAvailable() ? (
              <>
                <GlassView isInteractive style={{ borderRadius: 50 }}>
                  <TouchableOpacity
                    onPress={openEditProfileSheet}
                    style={{ padding: 12 }}
                    activeOpacity={0.7}
                  >
                    <SymbolView name="pencil" size={20} tintColor={Colors.primary} />
                  </TouchableOpacity>
                </GlassView>
                <GlassView isInteractive style={{ borderRadius: 50 }}>
                  <TouchableOpacity
                    onPress={() => router.push('/(home)/(profile)/settings')}
                    style={{ padding: 12 }}
                    activeOpacity={0.7}
                  >
                    <SymbolView name="gear" size={20} tintColor={Colors.primary} />
                  </TouchableOpacity>
                </GlassView>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={openEditProfileSheet}
                  className="w-11 h-11 rounded-full bg-surface-container items-center justify-center"
                >
                  <SymbolView name="pencil" size={20} tintColor={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(home)/(profile)/settings')}
                  className="w-11 h-11 rounded-full bg-surface-container items-center justify-center"
                >
                  <SymbolView name="gear" size={20} tintColor={Colors.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {!isLoaded ? (
            <View className="items-center justify-center pt-24">
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <>
              {/* Profile header */}
              <View>
                <ProfileHeader
                  profile={profile}
                  avatarUrl={user?.imageUrl}
                  displayName={displayName}
                  username={username}
                  memberYear={memberYear}
                  communitiesCount={joinedCommunitiesCount}
                  postsCount={myPosts.length}
                  ratedAlbumsCount={Object.keys(myRatingScores).length}
                  onRatedAlbumsPress={() => router.push('/(home)/(profile)/rated-albums')}
                  onEditPress={openEditProfileSheet}
                  onAvatarPress={handleAvatarPress}
                  isUploadingAvatar={isUploadingAvatar}
                />
              </View>

              {/* Content tabs */}
              <View className="px-5 pt-5">
                {isLiquidGlassAvailable() ? (
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
                    {/* Widgets */}
                    {hasWidgets ? (
                      <View className="px-5 pt-6 gap-6">
                        {orderedWidgets}
                      </View>
                    ) : (
                      <View className="px-6 pt-8 items-center">
                        <View
                          className="rounded-[32px] bg-surface-container-lowest p-8 items-center gap-3 w-full border border-black/5"
                        >
                          <View className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-1">
                            <Ionicons name="musical-notes" size={28} color={Colors.onSurfaceVariant} />
                          </View>
                          <Text className="text-[20px] font-bold text-on-surface tracking-tight">
                            No Music Added
                          </Text>
                          <Text className="text-[15px] leading-6 text-on-surface-variant text-center max-w-[90%]">
                            Build your sonic identity. Add your top albums, songs, and artists to your profile.
                          </Text>
                          <TouchableOpacity
                            onPress={openEditProfileSheet}
                            className="mt-6 rounded-full px-6 py-3 bg-surface-container border border-outlineVariant/20"
                          >
                            <Text className="text-on-surface font-semibold text-[15px]">Add Music</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                  {/* My Posts */}
                  <View className="px-6 pt-6 pb-4">
                      <View className="flex-row items-center justify-between mb-5">
                        <Text className="text-on-surface font-bold text-[22px] tracking-tight">
                          Posts
                          {!loadingPosts && myPosts.length > 0 && (
                            <Text className="text-on-surface-variant font-medium text-[16px]">   {myPosts.length}</Text>
                          )}
                        </Text>
                        {!loadingPosts && myPosts.length > 0 && (
                          isLiquidGlassAvailable() ? (
                            <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
                              <TouchableOpacity
                                onPress={() =>
                                  setPostSort((s) => (s === 'newest' ? 'oldest' : s === 'oldest' ? 'top' : 'newest'))
                                }
                                className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full"
                                activeOpacity={0.8}
                              >
                                <Ionicons
                                  name={postSort === 'top' ? 'trending-up' : 'time-outline'}
                                  size={14}
                                  color={Colors.primary}
                                />
                                <Text className="text-[13px] font-semibold" style={{ color: Colors.primary }}>
                                  {postSort === 'newest' ? 'Newest' : postSort === 'oldest' ? 'Oldest' : 'Top'}
                                </Text>
                              </TouchableOpacity>
                            </GlassView>
                          ) : (
                            <TouchableOpacity
                              onPress={() =>
                                setPostSort((s) => (s === 'newest' ? 'oldest' : s === 'oldest' ? 'top' : 'newest'))
                              }
                              className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-low"
                            >
                              <Ionicons
                                name={postSort === 'top' ? 'trending-up' : 'time-outline'}
                                size={14}
                                color={Colors.onSurface}
                              />
                              <Text className="text-[13px] font-semibold text-on-surface">
                                {postSort === 'newest' ? 'Newest' : postSort === 'oldest' ? 'Oldest' : 'Top'}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>

                      {loadingPosts ? (
                        <View className="py-8 items-center">
                          <ActivityIndicator size="small" color={Colors.onSurfaceVariant} />
                        </View>
                      ) : myPosts.length === 0 ? (
                        <View className="py-14 items-center bg-surface-container-lowest rounded-[32px] border border-black/5 gap-3">
                          <View className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-1">
                            <Ionicons name="document-text" size={28} color={Colors.onSurfaceVariant} />
                          </View>
                          <Text className="text-[20px] font-bold text-on-surface tracking-tight">No Posts Yet</Text>
                          <Text className="text-[15px] text-on-surface-variant text-center max-w-[80%] leading-6">
                            When you share your thoughts with communities, they&apos;ll appear here.
                          </Text>
                        </View>
                      ) : (
                        <>
                          {/* Search */}
                          <View className="mb-4 h-12 flex-row items-center gap-3 rounded-[16px] bg-surface-container-low/50 px-4">
                            <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
                            <TextInput
                              value={postSearch}
                              onChangeText={setPostSearch}
                              placeholder="Search posts"
                              placeholderTextColor={Colors.onSurfaceVariant}
                              className="flex-1 text-[15px] text-on-surface"
                              style={{
                                color: Colors.onSurface,
                                lineHeight: 20,
                                paddingVertical: 0,
                                ...(Platform.OS === 'android'
                                  ? { includeFontPadding: false, textAlignVertical: 'center' as const }
                                  : {}),
                              }}
                              returnKeyType="search"
                            />
                            {postSearch.length > 0 && (
                              <TouchableOpacity onPress={() => setPostSearch('')}>
                                <Ionicons name="close-circle" size={18} color={Colors.onSurfaceVariant} />
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Media type chips */}
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mb-6"
                            contentContainerStyle={{ gap: 10 }}
                          >
                            {(['all', 'photo', 'video'] as const).map((f) => {
                              const active = postMediaFilter === f
                              const label = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)
                              return (
                                isLiquidGlassAvailable() ? (
                                  <GlassView key={f} isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
                                    <TouchableOpacity
                                      onPress={() => setPostMediaFilter(f)}
                                      className="rounded-full px-5 py-2"
                                      style={{
                                        backgroundColor: active ? `${Colors.primary}22` : 'transparent',
                                      }}
                                      activeOpacity={0.8}
                                    >
                                      <Text
                                        className="text-[14px] font-semibold tracking-tight"
                                        style={{ color: active ? Colors.primary : Colors.onSurfaceVariant }}
                                      >
                                        {label}
                                      </Text>
                                    </TouchableOpacity>
                                  </GlassView>
                                ) : (
                                  <TouchableOpacity
                                    key={f}
                                    onPress={() => setPostMediaFilter(f)}
                                    className="rounded-full px-5 py-2"
                                    style={{
                                      backgroundColor: active ? Colors.onSurface : Colors.surfaceContainerLow,
                                    }}
                                  >
                                    <Text
                                      className="text-[14px] font-semibold tracking-tight"
                                      style={{ color: active ? Colors.surface : Colors.onSurfaceVariant }}
                                    >
                                      {label}
                                    </Text>
                                  </TouchableOpacity>
                                )
                              )
                            })}
                          </ScrollView>

                          {filteredPosts.length === 0 ? (
                            <View className="py-10 items-center bg-surface-container-low rounded-2xl">
                              <Ionicons name="search-outline" size={28} color={Colors.onSurfaceVariant} />
                              <Text className="text-on-surface-variant text-sm mt-2">No posts match your filters</Text>
                            </View>
                          ) : (
                            <View>
                              {filteredPosts.map((post) => (
                                <FeedPostCard
                                  key={post.id}
                                  post={post}
                                  onPostUpdated={(updated) =>
                                    setMyPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                                  }
                                  communityRoute="/(home)/(profile)/community"
                                  postRoute="/(home)/(profile)/post"
                                />
                              ))}
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </>
                )}
              </TabSlideTransition>
            </>
          )}
        </ScrollView>

        <AlbumRatingModal
          visible={ratingAlbum !== null}
          album={ratingAlbum}
          currentUserId={backendUser?.id}
          onClose={() => setRatingAlbum(null)}
          onRatingChange={(albumId, score) => {
            setMyRatingScores((prev) => {
              if (score === null) {
                const next = { ...prev }
                delete next[albumId]
                return next
              }
              return { ...prev, [albumId]: score }
            })
          }}
        />
      </View>
    </SwipeableTabScreen>
  )
}
