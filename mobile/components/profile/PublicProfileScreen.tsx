import FeedPostCard from '@/components/feed/FeedPostCard'
import ProfileHeader from '@/components/profile/ProfileHeader'
import CurrentlyListeningWidget from '@/components/profile/widgets/CurrentlyListeningWidget'
import TopAlbumsWidget from '@/components/profile/widgets/TopAlbumsWidget'
import TopArtistsWidget from '@/components/profile/widgets/TopArtistsWidget'
import TopSongsWidget from '@/components/profile/widgets/TopSongsWidget'
import { Colors } from '@/constants/colors'
import { useAuthToken } from '@/hooks/useAuthToken'
import { useSpotifyTopMusic } from '@/hooks/useSpotifyTopMusic'
import {
  backendUserToProfile,
  fetchPostsByAuthor,
  fetchUserById,
  type BackendUser,
} from '@/lib/api'
import type { PostResDto } from '@/models/PostRes'
import { Ionicons } from '@expo/vector-icons'
import { router, useSegments } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@clerk/expo'
import { communityBasePath, homeTabRootPath, postBasePath, resolveHomeTab } from '@/lib/profileRoutes'

const DEFAULT_WIDGET_ORDER = ['topAlbums', 'currentlyListening', 'topSongs', 'topArtists'] as const

interface PublicProfileScreenProps {
  userId: string
}

export default function PublicProfileScreen({ userId }: PublicProfileScreenProps) {
  const insets = useSafeAreaInsets()
  const segments = useSegments()
  const currentTab = resolveHomeTab(segments, '(profile)')
  const { user } = useUser()
  const { refreshToken } = useAuthToken()
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null)
  const [posts, setPosts] = useState<PostResDto[]>([])
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const token = await refreshToken()
      if (!token) {
        setBackendUser(null)
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
    } catch (error) {
      console.error('Failed to load public profile:', error)
      setBackendUser(null)
      setPosts([])
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

  const { spotifyTopMusic } = useSpotifyTopMusic({
    targetUserId: backendUser?.id,
    spotifyConnected: profile?.spotifyConnected,
    syncTopAlbumsWithSpotify: profile?.syncTopAlbumsWithSpotify,
    syncTopSongsWithSpotify: profile?.syncTopSongsWithSpotify,
    syncTopArtistsWithSpotify: profile?.syncTopArtistsWithSpotify,
  })

  const topAlbums = profile?.syncTopAlbumsWithSpotify && profile.spotifyConnected
    ? spotifyTopMusic.topAlbums
    : profile?.topAlbums
  const topSongs = profile?.syncTopSongsWithSpotify && profile.spotifyConnected
    ? spotifyTopMusic.topSongs
    : profile?.topSongs
  const topArtists = profile?.syncTopArtistsWithSpotify && profile.spotifyConnected
    ? spotifyTopMusic.topArtists
    : profile?.topArtists

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
          return profile.currentlyListening?.title || profile.spotifyConnected
            ? [
                <CurrentlyListeningWidget
                  key={type}
                  track={profile.currentlyListening}
                  spotifyConnected={profile.spotifyConnected}
                  spotifyUserId={backendUser?.id}
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
  }, [backendUser?.id, profile, topAlbums, topArtists, topSongs])

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
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
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
          onEditPress={() => undefined}
        />

        {orderedWidgets.length > 0 ? (
          <View className="gap-6 px-5 pt-8">{orderedWidgets}</View>
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

        <View className="px-6 pb-4 pt-12">
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
      </ScrollView>
    </View>
  )
}
