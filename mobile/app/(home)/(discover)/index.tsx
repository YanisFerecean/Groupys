import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SectionHeader from '@/components/ui/SectionHeader'
import { TopArtistRows, TopArtistsSkeleton, useTopArtists } from '@/components/discover/TopArtistsSection'
import CommunityCard from '@/components/discover/CommunityCard'
import UserOnlineCard from '@/components/discover/UserOnlineCard'
import SearchOverlay from '@/components/discover/SearchOverlay'
import { Colors } from '@/constants/colors'
import { communities, activeUsers } from '@/constants/mockData'

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets()
  const { artists, expanded, loading, toggleExpand } = useTopArtists()
  const [searchOpen, setSearchOpen] = useState(false)

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
            {"Tap In"}
          </Text>
          <TouchableOpacity onPress={() => setSearchOpen(true)}>
            <Ionicons name="search" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Trending Now */}
        <View className="pt-6">
          <View className="px-5">
            <SectionHeader
              title="Trending Now"
              actionText={!loading && artists.length > 3 ? (expanded ? 'Show Less' : 'View All') : undefined}
              onAction={toggleExpand}
            />
          </View>
          {loading ? (
            <TopArtistsSkeleton />
          ) : (
            <TopArtistRows artists={artists} expanded={expanded} />
          )}
        </View>

        {/* Explore Communities */}
        <View className="px-5 pt-8 pb-2">
          <SectionHeader title="Explore Communities" actionText="See All" />
          <View className="mt-4 gap-3">
            <View className="flex-row gap-3">
              {communities.slice(0, 2).map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </View>
            <View className="flex-row gap-3">
              {communities.slice(2, 4).map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </View>
          </View>
        </View>

        {/* Who's On */}
        <View className="pt-8 pb-2">
          <View className="px-5">
            <SectionHeader title="Who's On?" actionText="See All" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 10 }}
          >
            {activeUsers.map((user) => (
              <UserOnlineCard key={user.id} user={user} />
            ))}
          </ScrollView>
        </View>

      </ScrollView>



      {/* Search overlay — rendered last so it sits on top */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </View>
  )
}
