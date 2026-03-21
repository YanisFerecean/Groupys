import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ProfileHeader from '@/components/profile/ProfileHeader'
import AlbumOfWeek from '@/components/profile/AlbumOfWeek'
import TopArtists from '@/components/profile/TopArtists'
import ListeningProfile from '@/components/profile/ListeningProfile'
import SectionHeader from '@/components/ui/SectionHeader'
import { Colors } from '@/constants/colors'
import {
  userProfile,
  albumOfWeek,
  topArtists,
  listeningMetrics,
} from '@/constants/mockData'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">
            Profile
          </Text>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Header */}
        <View className="pt-6">
          <ProfileHeader profile={userProfile} />
        </View>

        {/* Album of the Week */}
        <View className="px-5 pt-6">
          <SectionHeader
            title="Album of the Week"
            actionText="View Selection"
          />
          <View className="mt-4">
            <AlbumOfWeek album={albumOfWeek} />
          </View>
        </View>

        {/* Top Artists */}
        <View className="px-5 pt-8">
          <SectionHeader title="Top Artists" actionText=">" />
          <View className="mt-4">
            <TopArtists artists={topArtists} />
          </View>
        </View>

        {/* Listening Profile */}
        <View className="px-5 pt-8">
          <Text className="text-xl font-bold text-on-surface">
            Listening Profile
          </Text>
          <View className="mt-4">
            <ListeningProfile metrics={listeningMetrics} />
          </View>
        </View>

        {/* Settings Link */}
        <View className="px-5 pt-8">
          <TouchableOpacity
            className="items-center rounded-2xl bg-surface-container-high py-4"
            onPress={() => router.push('/(home)/(profile)/settings')}
          >
            <Text className="font-semibold text-on-surface">Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}
