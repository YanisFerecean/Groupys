import { SymbolView } from 'expo-symbols'
import { useAuth } from '@clerk/expo'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CommunityShowcaseCard from '@/components/discover/CommunityShowcaseCard'
import { Colors } from '@/constants/colors'
import { apiFetch } from '@/lib/api'
import type { CommunityResDto } from '@/models/CommunityRes'

const COMMUNITY_PAGE_SIZE = 6

function ArtistCommunitiesContent() {
  const insets = useSafeAreaInsets()
  const { id, artistName } = useLocalSearchParams<{ id: string; artistName?: string }>()
  const { getToken, isLoaded: isAuthLoaded } = useAuth()

  const [communities, setCommunities] = useState<CommunityResDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [visibleCount, setVisibleCount] = useState(COMMUNITY_PAGE_SIZE)

  const loadCommunities = useCallback(async (isRefresh = false) => {
    if (!id || !isAuthLoaded) return

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const token = await getToken()
      const result = await apiFetch<CommunityResDto[]>(`/communities/artist/${id}`, token).catch(
        () => [] as CommunityResDto[],
      )
      setCommunities(result)
    } catch (err) {
      console.error('Failed to fetch artist communities:', err)
      setCommunities([])
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [getToken, id, isAuthLoaded])

  useEffect(() => {
    if (!id || !isAuthLoaded) return
    void loadCommunities()
  }, [id, isAuthLoaded, loadCommunities])

  useEffect(() => {
    setVisibleCount((prev) => {
      if (communities.length === 0) return COMMUNITY_PAGE_SIZE
      return Math.min(Math.max(prev, COMMUNITY_PAGE_SIZE), communities.length)
    })
  }, [communities.length])

  const visibleCommunities = useMemo(
    () => communities.slice(0, visibleCount),
    [communities, visibleCount],
  )

  const canLoadMore = visibleCount < communities.length
  const resolvedArtistName = typeof artistName === 'string' && artistName.trim().length > 0
    ? artistName
    : 'Artist'

  const handleRefresh = useCallback(() => {
    setVisibleCount(COMMUNITY_PAGE_SIZE)
    void loadCommunities(true)
  }, [loadCommunities])

  const handleLoadMore = useCallback(() => {
    if (loading || refreshing || !canLoadMore) return
    setVisibleCount((prev) => Math.min(prev + COMMUNITY_PAGE_SIZE, communities.length))
  }, [canLoadMore, communities.length, loading, refreshing])

  return (
    <View className="flex-1 bg-surface">
      <FlatList
        data={visibleCommunities}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 20) + 12,
          paddingTop: 8,
          gap: 12,
        }}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={9}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={(
          <View style={{ paddingTop: 28, paddingBottom: 8 }}>
            <Text
              style={{
                fontSize: 28,
                fontFamily: 'DMSans_700Bold',
                color: Colors.onSurface,
                letterSpacing: -0.5,
              }}
              numberOfLines={1}
            >
              <Text style={{ color: Colors.primary }}>{resolvedArtistName}</Text>
              {' '}communities
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                fontFamily: 'DMSans_400Regular',
                color: Colors.onSurfaceVariant,
              }}
            >
              Showing {communities.length} communities
            </Text>
            <View style={{ marginTop: 16, height: 1, backgroundColor: Colors.outlineVariant }} />
          </View>
        )}
        renderItem={({ item }) => (
          <View className="w-full">
            <CommunityShowcaseCard
              community={item}
              href={{ pathname: '/(home)/(discover)/community/[id]', params: { id: item.id } }}
              replace
              withAppleZoom
            />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text className="text-on-surface-variant text-sm mt-3">Loading communities...</Text>
            </View>
          ) : (
            <View className="items-center py-8">
              <SymbolView name="person.2" size={32} tintColor={Colors.onSurfaceVariant} />
              <Text className="text-on-surface-variant text-sm mt-2">No communities yet.</Text>
            </View>
          )
        }
        ListFooterComponent={
          communities.length > 0 ? (
            <Text className="text-center text-on-surface-variant text-xs mt-1">
              Showing {visibleCommunities.length} of {communities.length}
            </Text>
          ) : null
        }
      />
    </View>
  )
}

function IOSArtistCommunitiesSheet() {
  const useGlass = isLiquidGlassAvailable()

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75],
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_bottom',
        }}
      />
      {useGlass ? (
        <GlassView style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          <ArtistCommunitiesContent />
        </GlassView>
      ) : (
        <BlurView tint="systemMaterial" intensity={100} style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          <ArtistCommunitiesContent />
        </BlurView>
      )}
    </>
  )
}

function AndroidArtistCommunitiesSheet() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Host, ModalBottomSheet, RNHostView } = require('@expo/ui/jetpack-compose')

  return (
    <Host matchContents>
      <ModalBottomSheet
        containerColor={Colors.surface}
        showDragHandle
        onDismissRequest={() => router.back()}
      >
        <RNHostView matchContents>
          <ArtistCommunitiesContent />
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  )
}

export default function ArtistCommunitiesScreen() {
  if (Platform.OS === 'android') {
    return <AndroidArtistCommunitiesSheet />
  }

  return <IOSArtistCommunitiesSheet />
}
