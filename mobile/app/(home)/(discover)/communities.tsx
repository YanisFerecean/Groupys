import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CommunityRecommendationCard from '@/components/discover/CommunityRecommendationCard'
import { Colors } from '@/constants/colors'
import { DISCOVER_PREVIEW_COMMUNITY_COUNT } from '@/constants/discovery'
import { useDiscovery } from '@/hooks/useDiscovery'

const COMMUNITY_PAGE_SIZE = 6

export default function DiscoverCommunitiesScreen() {
  const insets = useSafeAreaInsets()
  const { isLoaded: isAuthLoaded } = useAuth()
  const useGlass = isLiquidGlassAvailable()
  const [visibleCount, setVisibleCount] = useState(COMMUNITY_PAGE_SIZE)

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
  const visibleCommunities = displayedCommunities.slice(0, visibleCount)
  const canLoadMore = visibleCount < displayedCommunities.length

  useEffect(() => {
    setVisibleCount((prev) => {
      if (displayedCommunities.length === 0) return COMMUNITY_PAGE_SIZE
      return Math.min(Math.max(prev, COMMUNITY_PAGE_SIZE), displayedCommunities.length)
    })
  }, [displayedCommunities.length])

  const handleRefresh = () => {
    setVisibleCount(COMMUNITY_PAGE_SIZE)
    loadCommunities(true)
  }

  const handleLoadMore = () => {
    if (displayedCommunitiesLoading || displayedCommunitiesRefreshing || !canLoadMore) return
    setVisibleCount((prev) => Math.min(prev + COMMUNITY_PAGE_SIZE, displayedCommunities.length))
  }

  const handleJoinCommunity = (communityId: string) => {
    joinCommunity(communityId)
  }

  const handleOpenCommunity = (communityId: string) => {
    router.push(`/(home)/(discover)/community/${communityId}` as any)
  }

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center px-5" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
        {useGlass ? (
          <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              className="h-10 w-10 items-center justify-center rounded-full"
            >
              <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.surfaceContainerLow }}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
        )}

        <View className="flex-1 items-center">
          {useGlass ? (
            <GlassView style={{ borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' }}>
                <Text className="text-on-surface text-xl font-bold">Suggested for you</Text>
                <Text className="text-on-surface-variant text-xs">
                  Showing {displayedCommunities.length} communities
                </Text>
              </View>
            </GlassView>
          ) : (
            <>
              <Text className="text-on-surface text-2xl font-bold">Suggested for you</Text>
              <Text className="text-on-surface-variant text-sm">
                Showing {displayedCommunities.length} communities
              </Text>
            </>
          )}
        </View>

        <View className="h-10 w-10" />
      </View>

      <FlatList
        data={displayedCommunitiesLoading ? [] : visibleCommunities}
        keyExtractor={(item) => item.communityId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 4 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        initialNumToRender={COMMUNITY_PAGE_SIZE}
        maxToRenderPerBatch={COMMUNITY_PAGE_SIZE}
        windowSize={7}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={displayedCommunitiesRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item: community }) => (
          <View style={{ alignItems: 'center' }}>
            <CommunityRecommendationCard
              community={community}
              onPress={() => handleOpenCommunity(community.communityId)}
              onJoin={() => handleJoinCommunity(community.communityId)}
              widthRatio={0.9}
            />
          </View>
        )}
        ListEmptyComponent={
          displayedCommunitiesLoading ? (
            <View className="items-center py-6">
              <Text className="text-on-surface-variant text-sm font-medium">Finding communities...</Text>
            </View>
          ) : (
            <View className="items-center py-6">
              <Ionicons name="people-outline" size={32} color={Colors.onSurfaceVariant} />
              <Text className="text-on-surface-variant text-sm mt-2 font-medium">No suggestions right now</Text>
            </View>
          )
        }
        ListFooterComponent={
          displayedCommunities.length > DISCOVER_PREVIEW_COMMUNITY_COUNT ? (
            <Text className="text-center text-on-surface-variant text-xs mt-2">
              Showing {visibleCommunities.length} of {displayedCommunities.length}
            </Text>
          ) : null
        }
      />
    </View>
  )
}
