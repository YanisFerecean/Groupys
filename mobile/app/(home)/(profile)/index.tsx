import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth, useUser } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Colors } from '@/constants/colors'
import { useProfileCustomization } from '@/hooks/useProfileCustomization'
import type { ProfileCustomization } from '@/models/ProfileCustomization'
import ProfileHeader from '@/components/profile/ProfileHeader'
import TopAlbumsWidget from '@/components/profile/widgets/TopAlbumsWidget'
import TopSongsWidget from '@/components/profile/widgets/TopSongsWidget'
import TopArtistsWidget from '@/components/profile/widgets/TopArtistsWidget'
import CurrentlyListeningWidget from '@/components/profile/widgets/CurrentlyListeningWidget'
import EditProfileModal from '@/components/profile/EditProfileModal'
import FeedPostCard from '@/components/feed/FeedPostCard'
import { fetchMyPosts } from '@/lib/api'
import type { PostResDto } from '@/models/PostRes'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()
  const { profile, backendUser, updateProfile, isLoaded, isSaving } = useProfileCustomization()
  const [editOpen, setEditOpen] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // My posts
  const [myPosts, setMyPosts] = useState<PostResDto[]>([])
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
        const data = await fetchMyPosts(token)
        setMyPosts(data)
      } catch (err) {
        console.error('Failed to fetch my posts:', err)
      } finally {
        setLoadingPosts(false)
      }
    }
    fetchPosts()
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

  const displayName =
    profile.displayName ?? user?.fullName ?? user?.username ?? 'Music Fan'
  const username = backendUser?.username ?? user?.username ?? ''
  const memberYear = backendUser?.dateJoined
    ? new Date(backendUser.dateJoined).getFullYear()
    : user?.createdAt
      ? new Date(user.createdAt).getFullYear()
      : undefined

  const hasWidgets =
    profile.topAlbums?.length ||
    profile.topSongs?.length ||
    profile.topArtists?.length ||
    profile.currentlyListening?.title

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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">Profile</Text>
          <TouchableOpacity onPress={() => router.push('/(home)/(profile)/settings')}>
            <Ionicons name="settings-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {!isLoaded ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            {/* Profile header */}
            <View className="pt-4">
              <ProfileHeader
                profile={profile}
                avatarUrl={user?.imageUrl}
                displayName={displayName}
                username={username}
                memberYear={memberYear}
                onEditPress={() => setEditOpen(true)}
                onAvatarPress={handleAvatarPress}
                isUploadingAvatar={isUploadingAvatar}
              />
            </View>

            {/* Widgets */}
            {hasWidgets ? (
              <View className="px-5 pt-6 gap-4">
                <CurrentlyListeningWidget 
                  track={profile.currentlyListening} 
                  spotifyConnected={profile.spotifyConnected} 
                />
                <TopAlbumsWidget
                  albums={profile.topAlbums}
                  containerColor={profile.albumsContainerColor}
                />
                <TopSongsWidget
                  songs={profile.topSongs}
                  containerColor={profile.songsContainerColor}
                />
                <TopArtistsWidget
                  artists={profile.topArtists}
                  containerColor={profile.artistsContainerColor}
                />
              </View>
            ) : (
              <View className="px-5 pt-8 items-center">
                <View className="rounded-2xl bg-surface-container-low p-6 items-center gap-3 w-full">
                  <Ionicons name="musical-notes-outline" size={32} color={Colors.onSurfaceVariant} />
                  <Text className="text-base font-semibold text-on-surface">
                    No music added yet
                  </Text>
                  <Text className="text-sm text-on-surface-variant text-center">
                    Tap Edit Profile to add your top albums, songs, and artists.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditOpen(true)}
                    className="mt-2 rounded-full px-5 py-2.5"
                    style={{ backgroundColor: Colors.primary }}
                  >
                    <Text className="text-white font-bold text-sm">Add Music</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* My Posts */}
            <View className="px-5 pt-10 pb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-on-surface font-bold text-base">
                  My Posts
                  {!loadingPosts && myPosts.length > 0 && (
                    <Text className="text-on-surface-variant font-normal text-sm"> ({myPosts.length})</Text>
                  )}
                </Text>
                {!loadingPosts && myPosts.length > 0 && (
                  <TouchableOpacity
                    onPress={() =>
                      setPostSort((s) => (s === 'newest' ? 'oldest' : s === 'oldest' ? 'top' : 'newest'))
                    }
                    className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container"
                  >
                    <Ionicons
                      name={postSort === 'top' ? 'trending-up' : 'time-outline'}
                      size={14}
                      color={Colors.primary}
                    />
                    <Text className="text-xs font-semibold" style={{ color: Colors.primary }}>
                      {postSort === 'newest' ? 'Newest' : postSort === 'oldest' ? 'Oldest' : 'Top'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {loadingPosts ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : myPosts.length === 0 ? (
                <View className="py-12 items-center bg-surface-container-low rounded-2xl border border-surface-container-high">
                  <Ionicons name="newspaper-outline" size={32} color={Colors.onSurfaceVariant} />
                  <Text className="text-on-surface-variant text-sm mt-2">No posts yet</Text>
                </View>
              ) : (
                <>
                  {/* Search */}
                  <View className="flex-row items-center bg-surface-container rounded-xl px-4 py-3 gap-3 mb-3">
                    <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
                    <TextInput
                      value={postSearch}
                      onChangeText={setPostSearch}
                      placeholder="Search posts…"
                      placeholderTextColor={Colors.onSurfaceVariant}
                      className="flex-1 text-sm text-on-surface"
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
                    className="mb-4"
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {(['all', 'text', 'photo', 'video'] as const).map((f) => {
                      const active = postMediaFilter === f
                      const label = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)
                      const icon =
                        f === 'all'
                          ? 'apps-outline'
                          : f === 'text'
                            ? 'document-text-outline'
                            : f === 'photo'
                              ? 'image-outline'
                              : 'videocam-outline'
                      return (
                        <TouchableOpacity
                          key={f}
                          onPress={() => setPostMediaFilter(f)}
                          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
                          style={{
                            backgroundColor: active ? Colors.primary : Colors.surfaceContainer,
                            borderWidth: 1,
                            borderColor: active ? Colors.primary : Colors.outlineVariant,
                          }}
                        >
                          <Ionicons
                            name={icon as any}
                            size={14}
                            color={active ? '#fff' : Colors.onSurfaceVariant}
                          />
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: active ? '#fff' : Colors.onSurfaceVariant }}
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
    </View>
  )
}
