import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useEffect } from 'react'
import { ScrollView, Text, View, RefreshControl } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SwipeableTabScreen from '@/components/navigation/SwipeableTabScreen'
import SectionHeader from '@/components/ui/SectionHeader'
import { TopArtistRows, TopArtistsSkeleton, useTopArtists } from '@/components/discover/TopArtistsSection'
import CommunityRecommendationCard from '@/components/discover/CommunityRecommendationCard'
import SearchOverlay from '@/components/discover/SearchOverlay'
import { Colors } from '@/constants/colors'
import { DISCOVER_PREVIEW_COMMUNITY_COUNT } from '@/constants/discovery'
import { useDiscovery } from '@/hooks/useDiscovery'

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets()
  const { isLoaded: isAuthLoaded } = useAuth()
  const { artists, expanded, loading: artistsLoading, toggleExpand } = useTopArtists()
  const params = useLocalSearchParams<{ search?: string; q?: string }>()
  const searchOpen = params.search === '1'
  const searchQuery = typeof params.q === 'string' ? params.q : ''

  const {
    communities,
    communitiesLoading,
    communitiesRefreshing,
    loadCommunities,
    joinCommunity,
  } = useDiscovery()

  useEffect(() => {
    if (!isAuthLoaded) return
    loadCommunities()
  }, [isAuthLoaded, loadCommunities])

  const displayedCommunities = communities
  const displayedCommunitiesLoading = communitiesLoading
  const displayedCommunitiesRefreshing = communitiesRefreshing
  const previewCommunities = displayedCommunities.slice(0, DISCOVER_PREVIEW_COMMUNITY_COUNT)

  const handleCommunitiesRefresh = () => {
    loadCommunities(true)
  }

  const navigateToCommunity = (communityId: string) => {
    router.push(`/(home)/(discover)/community/${communityId}` as any)
  }

  const handleJoinCommunity = (communityId: string) => {
    joinCommunity(communityId)
  }

  const handleShowMoreCommunities = () => {
    router.push('/(home)/(discover)/communities' as any)
  }

  return (
    <SwipeableTabScreen tab="(discover)">
      <View className="flex-1 bg-surface">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={displayedCommunitiesRefreshing}
              onRefresh={handleCommunitiesRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Header */}
          <View className="px-5" style={{ paddingTop: insets.top + 8 }}>
            <Text className="text-4xl font-extrabold tracking-tighter text-primary">
              Tap In
            </Text>
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
          <View className="pt-8 pb-2">
            <View className="px-5">
              <SectionHeader
                title="Suggested for you"
                actionText={displayedCommunities.length > DISCOVER_PREVIEW_COMMUNITY_COUNT ? 'Show More' : undefined}
                onAction={handleShowMoreCommunities}
              />
            </View>
            {displayedCommunitiesLoading ? (
              <View className="mt-4 items-center py-6">
                <Text className="text-on-surface-variant text-sm font-medium">Finding communities...</Text>
              </View>
            ) : displayedCommunities.length === 0 ? (
              <View className="mt-4 mx-5 items-center py-6">
                <Ionicons name="people-outline" size={32} color={Colors.onSurfaceVariant} />
                <Text className="text-on-surface-variant text-sm mt-2 font-medium">No suggestions right now</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 12 }}
              >
                {previewCommunities.map((community) => (
                  <CommunityRecommendationCard
                    key={community.communityId}
                    community={community}
                    onPress={() => navigateToCommunity(community.communityId)}
                    onJoin={() => handleJoinCommunity(community.communityId)}
                  />
                ))}
              </ScrollView>
            )}
          </View>


        </ScrollView>

        {/* Search overlay */}
        {searchOpen && (
          <SearchOverlay
            initialQuery={searchQuery}
            onClose={() => router.setParams({ search: undefined, q: undefined } as any)}
          />
        )}
      </View>
    </SwipeableTabScreen>
  )
}
