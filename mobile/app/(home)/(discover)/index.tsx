import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useEffect, useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SectionHeader from '@/components/ui/SectionHeader'
import { TopArtistRows, TopArtistsSkeleton, useTopArtists } from '@/components/discover/TopArtistsSection'
import CommunityRecommendationCard from '@/components/discover/CommunityRecommendationCard'
import UserOnlineCard from '@/components/discover/UserOnlineCard'
import SearchOverlay from '@/components/discover/SearchOverlay'
import { Colors } from '@/constants/colors'
import { activeUsers } from '@/constants/mockData'
import { useDiscovery } from '@/hooks/useDiscovery'

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets()
  const { isLoaded: isAuthLoaded } = useAuth()
  const { artists, expanded, loading: artistsLoading, toggleExpand } = useTopArtists()
  const [searchOpen, setSearchOpen] = useState(false)
  
  const {
    communities,
    communitiesLoading,
    communitiesRefreshing,
    loadCommunities,
    joinCommunity,
    dismiss
  } = useDiscovery()

  useEffect(() => {
    if (!isAuthLoaded) return
    loadCommunities()
  }, [isAuthLoaded, loadCommunities])

  const navigateToCommunity = (communityId: string) => {
    router.push(`/(home)/(discover)/community/${communityId}` as any)
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={communitiesRefreshing} 
            onRefresh={() => loadCommunities(true)} 
            tintColor={Colors.primary} 
          />
        }
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">
            Tap In
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
              actionText={!artistsLoading && artists.length > 3 ? (expanded ? 'Show Less' : 'View All') : undefined}
              onAction={toggleExpand}
            />
          </View>
          {artistsLoading ? (
            <TopArtistsSkeleton />
          ) : (
            <TopArtistRows artists={artists} expanded={expanded} />
          )}
        </View>

        {/* Explore Communities (Recommendations) */}
        <View className="px-5 pt-8 pb-2">
          <SectionHeader title="Suggested for you" actionText={communities.length > 0 ? "Refresh" : undefined} onAction={() => loadCommunities(true)} />
          {communitiesLoading ? (
            <View className="mt-4 items-center py-6">
              <Text className="text-on-surface-variant text-sm font-medium">Finding communities...</Text>
            </View>
          ) : communities.length === 0 ? (
            <View className="mt-4 items-center py-6">
              <Ionicons name="people-outline" size={32} color={Colors.onSurfaceVariant} />
              <Text className="text-on-surface-variant text-sm mt-2 font-medium">No suggestions right now</Text>
            </View>
          ) : (
            <View className="mt-4 gap-4">
              {communities.map((community) => (
                <CommunityRecommendationCard
                  key={community.communityId}
                  community={community}
                  onPress={() => navigateToCommunity(community.communityId)}
                  onJoin={() => joinCommunity(community.communityId)}
                  onDismiss={() => dismiss('community', community.communityId)}
                />
              ))}
            </View>
          )}
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

      {/* Search overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </View>
  )
}
