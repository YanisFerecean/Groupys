import FeedPostCard from '@/components/feed/FeedPostCard'
import EditProfileModal from '@/components/profile/EditProfileModal'
import ProfileHeader from '@/components/profile/ProfileHeader'
import CurrentlyListeningWidget from '@/components/profile/widgets/CurrentlyListeningWidget'
import TopAlbumsWidget from '@/components/profile/widgets/TopAlbumsWidget'
import TopArtistsWidget from '@/components/profile/widgets/TopArtistsWidget'
import TopSongsWidget from '@/components/profile/widgets/TopSongsWidget'
import AlbumRatingModal from '@/components/album/AlbumRatingModal'
import { Colors } from '@/constants/colors'
import { useProfileCustomization } from '@/hooks/useProfileCustomization'
import { useSpotifyTopMusic } from '@/hooks/useSpotifyTopMusic'
import { apiFetch, fetchMyPosts, fetchMyAlbumRatings } from '@/lib/api'
import type { CommunityResDto } from '@/models/CommunityRes'
import type { PostResDto } from '@/models/PostRes'
import type { ProfileCustomization, TopAlbum } from '@/models/ProfileCustomization'
import { useAuth, useUser } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const DEFAULT_WIDGET_ORDER = ['topAlbums', 'currentlyListening', 'topSongs', 'topArtists'] as const
const WIDGET_MENU_WIDTH = 132
const WIDGET_SIZE_OPTIONS = ['small', 'normal'] as const
type ResizableWidgetType = 'topAlbums' | 'topSongs' | 'topArtists'
type WidgetSize = 'small' | 'normal'
type OpenWidgetMenuState = {
  type: ResizableWidgetType
  x: number
  y: number
} | null

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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const router = useRouter()
  const { user } = useUser()
  const { profile, backendUser, updateProfile, isLoaded, isSaving } = useProfileCustomization()
  const { spotifyTopMusic } = useSpotifyTopMusic({
    spotifyConnected: profile.spotifyConnected,
    syncTopAlbumsWithSpotify: profile.syncTopAlbumsWithSpotify,
    syncTopSongsWithSpotify: profile.syncTopSongsWithSpotify,
    syncTopArtistsWithSpotify: profile.syncTopArtistsWithSpotify,
  })
  const [editOpen, setEditOpen] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [openWidgetMenu, setOpenWidgetMenu] = useState<OpenWidgetMenuState>(null)
  const [ratingAlbum, setRatingAlbum] = useState<TopAlbum | null>(null)
  const [myRatingScores, setMyRatingScores] = useState<Record<number, number>>({})
  const widgetMenuTriggerRefs = useRef<Partial<Record<ResizableWidgetType, TouchableOpacity | null>>>({})

  // My posts
  const [myPosts, setMyPosts] = useState<PostResDto[]>([])
  const [joinedCommunitiesCount, setJoinedCommunitiesCount] = useState(0)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [postSearch, setPostSearch] = useState('')
  const [postMediaFilter, setPostMediaFilter] = useState<'all' | 'text' | 'photo' | 'video'>('all')
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

  useEffect(() => {
    if (!isLoaded) return
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
  }, [isLoaded])

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
        if (postMediaFilter === 'text') return p.media.length === 0
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

  const handleSaveProfile = async (data: Partial<ProfileCustomization>) => {
    await updateProfile(data)
  }
  const handleWidgetSizeChange = useCallback(
    async (type: ResizableWidgetType, size: WidgetSize) => {
      setOpenWidgetMenu(null)
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

  const handleWidgetMenuToggle = useCallback((type: ResizableWidgetType) => {
    if (openWidgetMenu?.type === type) {
      setOpenWidgetMenu(null)
      return
    }

    widgetMenuTriggerRefs.current[type]?.measureInWindow((x, y, width, height) => {
      setOpenWidgetMenu({
        type,
        x,
        y: y + height + 8,
      })
    })
  }, [openWidgetMenu])

  const displayName =
    profile.displayName ?? user?.fullName ?? user?.username ?? 'Music Fan'
  const username = backendUser?.username ?? user?.username ?? ''
  const memberYear = backendUser?.dateJoined
    ? backendUser.dateJoined
    : user?.createdAt
      ? user.createdAt.toISOString()
      : undefined

  const topAlbums = profile.syncTopAlbumsWithSpotify && profile.spotifyConnected
    ? spotifyTopMusic.topAlbums
    : profile.topAlbums
  const topSongs = profile.syncTopSongsWithSpotify && profile.spotifyConnected
    ? spotifyTopMusic.topSongs
    : profile.topSongs
  const topArtists = profile.syncTopArtistsWithSpotify && profile.spotifyConnected
    ? spotifyTopMusic.topArtists
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
          return profile.currentlyListening?.title
            ? [
                <CurrentlyListeningWidget
                  key={type}
                  track={profile.currentlyListening}
                  spotifyConnected={profile.spotifyConnected}
                />,
              ]
            : []
        case 'topAlbums':
          return topAlbums?.length
            ? [
                <View key={type} className="relative">
                  <View className="absolute z-20" style={{ right: 12, top: 12 }}>
                    <TouchableOpacity
                      ref={(node) => {
                        widgetMenuTriggerRefs.current.topAlbums = node
                      }}
                      onPress={() => handleWidgetMenuToggle('topAlbums')}
                      className="h-8 w-8 items-center justify-center"
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
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
                    <TouchableOpacity
                      ref={(node) => {
                        widgetMenuTriggerRefs.current.topSongs = node
                      }}
                      onPress={() => handleWidgetMenuToggle('topSongs')}
                      className="h-8 w-8 items-center justify-center"
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                  <WidgetFadeTransition transitionKey={profile.widgetSizes?.topSongs ?? 'normal'}>
                    <TopSongsWidget
                      songs={topSongs}
                      containerColor={profile.songsContainerColor}
                      textColor={profile.accentColor}
                      size={profile.widgetSizes?.topSongs}
                    />
                  </WidgetFadeTransition>
                </View>,
              ]
            : []
        case 'topArtists':
          return topArtists?.length
            ? [
                <View key={type} className="relative">
                  <View className="absolute z-20" style={{ right: 12, top: 12 }}>
                    <TouchableOpacity
                      ref={(node) => {
                        widgetMenuTriggerRefs.current.topArtists = node
                      }}
                      onPress={() => handleWidgetMenuToggle('topArtists')}
                      className="h-8 w-8 items-center justify-center"
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
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
    profile.spotifyConnected,
    profile.widgetOrder,
    profile.widgetSizes,
    topAlbums,
    topArtists,
    topSongs,
    myRatingScores,
    handleWidgetMenuToggle,
  ])
  const hasWidgets = orderedWidgets.length > 0
  const openWidgetMenuLeft = openWidgetMenu
    ? Math.min(Math.max(12, openWidgetMenu.x + 32 - WIDGET_MENU_WIDTH), screenWidth - WIDGET_MENU_WIDTH - 12)
    : 12

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
    <View className="flex-1 bg-surface">
      {/* Top bar overlay */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/30 items-center justify-center border border-white/10"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => setEditOpen(true)}
            className="w-10 h-10 rounded-full bg-black/30 items-center justify-center border border-white/10"
          >
            <Ionicons name="pencil" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-black/30 items-center justify-center border border-white/10">
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(home)/(profile)/settings')}
            className="w-10 h-10 rounded-full bg-black/30 items-center justify-center border border-white/10"
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setOpenWidgetMenu(null)}
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
                followingCount={profile.followingCount}
                followersCount={profile.followersCount}
                onEditPress={() => setEditOpen(true)}
                onAvatarPress={handleAvatarPress}
                isUploadingAvatar={isUploadingAvatar}
              />
            </View>

            {/* Widgets */}
            {hasWidgets ? (
              <View className="px-5 pt-8 gap-6">
                {orderedWidgets}
              </View>
            ) : (
              <View className="px-6 pt-10 items-center">
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
                    onPress={() => setEditOpen(true)}
                    className="mt-6 rounded-full px-6 py-3 bg-surface-container border border-outlineVariant/20"
                  >
                    <Text className="text-on-surface font-semibold text-[15px]">Add Music</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* My Posts */}
            <View className="px-6 pt-12 pb-4">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-on-surface font-bold text-[22px] tracking-tight">
                  Posts
                  {!loadingPosts && myPosts.length > 0 && (
                    <Text className="text-on-surface-variant font-medium text-[16px]">   {myPosts.length}</Text>
                  )}
                </Text>
                {!loadingPosts && myPosts.length > 0 && (
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
                  <View className="flex-row items-center bg-surface-container-low/50 rounded-[16px] px-4 py-3.5 gap-3 mb-4">
                    <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
                    <TextInput
                      value={postSearch}
                      onChangeText={setPostSearch}
                      placeholder="Search posts"
                      placeholderTextColor={Colors.onSurfaceVariant}
                      className="flex-1 text-[15px] text-on-surface"
                      style={{ color: Colors.onSurface }}
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
                    {(['all', 'text', 'photo', 'video'] as const).map((f) => {
                      const active = postMediaFilter === f
                      const label = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)
                      return (
                        <TouchableOpacity
                          key={f}
                          onPress={() => setPostMediaFilter(f)}
                          className="px-5 py-2 rounded-full"
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
      </ScrollView>

      {openWidgetMenu ? (
        <Pressable
          onPress={() => setOpenWidgetMenu(null)}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 40 }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-2xl bg-surface p-1"
            style={{
              position: 'absolute',
              top: openWidgetMenu.y,
              left: openWidgetMenuLeft,
              width: WIDGET_MENU_WIDTH,
              borderWidth: 1,
              borderColor: Colors.outlineVariant,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 12,
            }}
          >
            {WIDGET_SIZE_OPTIONS.map((size) => {
              const active = (profile.widgetSizes?.[openWidgetMenu.type] ?? 'normal') === size
              return (
                <TouchableOpacity
                  key={size}
                  disabled={isSaving}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    void handleWidgetSizeChange(openWidgetMenu.type, size)
                  }}
                  className="rounded-xl px-3 py-2"
                  style={{ backgroundColor: active ? Colors.surfaceContainerHigh : 'transparent' }}
                  activeOpacity={0.8}
                >
                  <Text className="text-xs font-semibold" style={{ color: active ? Colors.primary : Colors.onSurface }}>
                    {size === 'small' ? 'Small' : 'Normal'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </Pressable>
        </Pressable>
      ) : null}

      <EditProfileModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        isSaving={isSaving}
        onSave={handleSaveProfile}
        onAvatarPress={handleAvatarPress}
        isUploadingAvatar={isUploadingAvatar}
        avatarUrl={user?.imageUrl ?? null}
      />

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
  )
}
