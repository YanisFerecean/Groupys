import { useState } from 'react'
import { useRouter } from 'expo-router'
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Colors } from '@/constants/colors'
import { useProfileCustomization } from '@/hooks/useProfileCustomization'
import ProfileHeader from '@/components/profile/ProfileHeader'
import TopAlbumsWidget from '@/components/profile/widgets/TopAlbumsWidget'
import TopSongsWidget from '@/components/profile/widgets/TopSongsWidget'
import TopArtistsWidget from '@/components/profile/widgets/TopArtistsWidget'
import CurrentlyListeningWidget from '@/components/profile/widgets/CurrentlyListeningWidget'
import EditProfileModal from '@/components/profile/EditProfileModal'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()
  const { profile, backendUser, updateProfile, isLoaded, isSaving } = useProfileCustomization()
  const [editOpen, setEditOpen] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

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
                <CurrentlyListeningWidget track={profile.currentlyListening} />
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
          </>
        )}
      </ScrollView>

      <EditProfileModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        isSaving={isSaving}
        onSave={updateProfile}
        onAvatarPress={handleAvatarPress}
        isUploadingAvatar={isUploadingAvatar}
        avatarUrl={user?.imageUrl ?? null}
      />
    </View>
  )
}
