import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SectionHeader from '@/components/ui/SectionHeader'
import { TopArtistRows, TopArtistsSkeleton, useTopArtists } from '@/components/discover/TopArtistsSection'
import CommunityCard from '@/components/discover/CommunityCard'
import UserOnlineCard from '@/components/discover/UserOnlineCard'
import SearchOverlay from '@/components/discover/SearchOverlay'
import { apiFetch } from '@/lib/api'
import { communityResToCard } from '@/lib/communityUtils'
import { Colors } from '@/constants/colors'
import { activeUsers } from '@/constants/mockData'
import type { CommunityResDto } from '@/models/CommunityRes'

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets()
  const { getToken, isLoaded: isAuthLoaded } = useAuth()
  const getTokenRef = useRef(getToken)
  const { artists, expanded, loading, toggleExpand } = useTopArtists()
  const [searchOpen, setSearchOpen] = useState(false)
  const [communities, setCommunities] = useState<CommunityResDto[]>([])
  const [communitiesLoading, setCommunitiesLoading] = useState(true)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const fetchCommunities = useCallback(async () => {
    try {
      const token = await getTokenRef.current()
      const data = await apiFetch<CommunityResDto[]>('/communities', token)
      setCommunities(data)
    } catch (err) {
      console.error('Failed to fetch communities:', err)
    } finally {
      setCommunitiesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthLoaded) return
    fetchCommunities()
  }, [isAuthLoaded, fetchCommunities])

  const communityCards = communities.slice(0, 4).map(communityResToCard)

  const navigateToCommunity = (communityId: string) => {
    router.push(`/(home)/(discover)/community/${communityId}` as any)
  }

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
          {communitiesLoading ? (
            <View className="mt-4 items-center py-6">
              <Text className="text-on-surface-variant text-sm">Loading communities...</Text>
            </View>
          ) : communityCards.length === 0 ? (
            <View className="mt-4 items-center py-6">
              <Ionicons name="people-outline" size={32} color={Colors.onSurfaceVariant} />
              <Text className="text-on-surface-variant text-sm mt-2">No communities yet</Text>
            </View>
          ) : (
            <View className="mt-4 gap-3">
              <View className="flex-row gap-3">
                {communityCards.slice(0, 2).map((community, idx) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onPress={() => navigateToCommunity(communities[idx].id)}
                  />
                ))}
              </View>
              {communityCards.length > 2 ? (
                <View className="flex-row gap-3">
                  {communityCards.slice(2, 4).map((community, idx) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onPress={() => navigateToCommunity(communities[idx + 2].id)}
                    />
                  ))}
                </View>
              ) : null}
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
