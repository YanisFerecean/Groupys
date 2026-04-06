import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { apiFetch } from '@/lib/api'
import { normalizeMediaUrl } from '@/lib/media'
import type { CommunityResDto } from '@/models/CommunityRes'
import AuthImageWithToken from '@/components/ui/AuthImageWithToken'
import { useAuth } from '@clerk/expo'

export default function SelectCommunityScreen() {
  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const { selectedCommunityId } = useLocalSearchParams<{
    selectedCommunityId?: string
  }>()

  const [communities, setCommunities] = useState<CommunityResDto[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(
    selectedCommunityId ?? null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    let cancelled = false
    async function fetchCommunities() {
      try {
        const token = await getTokenRef.current()
        const data = await apiFetch<CommunityResDto[]>(
          '/communities/mine',
          token
        )
        if (cancelled) return
        setCommunities(data)
      } catch (err) {
        console.error('Failed to fetch communities:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCommunities()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelect = (community: CommunityResDto) => {
    setSelectedId(community.id)
    router.back()
    setTimeout(() => {
      router.setParams({
        selectedCommunityId: community.id,
        selectedCommunityName: community.name,
        selectedCommunityIconType: community.iconType,
        selectedCommunityIconEmoji: community.iconEmoji,
        selectedCommunityIconUrl: community.iconUrl,
        selectedCommunityDescription: community.description,
      })
    }, 100)
  }

  const handleDiscover = () => {
    router.back()
    setTimeout(() => {
      router.push('/(home)/(discover)')
    }, 100)
  }

  const renderItem = useCallback(({ item: community }: { item: CommunityResDto }) => (
    <TouchableOpacity
      onPress={() => handleSelect(community)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor:
          selectedId === community.id
            ? 'rgba(37, 99, 235, 0.08)'
            : 'transparent',
      }}
      activeOpacity={0.7}
    >
      {community.iconType === 'EMOJI' && community.iconEmoji ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: Colors.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Text style={{ fontSize: 20 }}>{community.iconEmoji}</Text>
        </View>
      ) : community.iconUrl ? (
        <AuthImageWithToken
          uri={normalizeMediaUrl(community.iconUrl)!}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: 14,
          }}
        />
      ) : (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Ionicons name="planet" size={20} color="#2563eb" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily:
              selectedId === community.id
                ? 'DMSans_600SemiBold'
                : 'DMSans_500Medium',
            color:
              selectedId === community.id ? '#2563eb' : Colors.onSurface,
          }}
        >
          {community.name}
        </Text>
        {community.description ? (
          <Text
            style={{
              fontSize: 12,
              fontFamily: 'DMSans_400Regular',
              color: Colors.onSurfaceVariant,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {community.description}
          </Text>
        ) : null}
      </View>
      {selectedId === community.id && (
        <Ionicons name="checkmark-circle" size={22} color="#2563eb" />
      )}
    </TouchableOpacity>
  ), [selectedId])

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: Colors.outlineVariant,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontFamily: 'DMSans_700Bold',
            color: Colors.onSurface,
          }}
        >
          Select Community
        </Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'DMSans_400Regular',
              color: Colors.onSurfaceVariant,
            }}
          >
            Loading communities...
          </Text>
        </View>
      ) : communities.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 48,
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: Colors.surfaceContainerHigh,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="people-outline"
              size={28}
              color={Colors.onSurfaceVariant}
            />
          </View>
          <Text
            style={{
              fontSize: 16,
              fontFamily: 'DMSans_700Bold',
              color: Colors.onSurface,
              marginBottom: 6,
            }}
          >
            No communities found
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontFamily: 'DMSans_400Regular',
              color: Colors.onSurfaceVariant,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            You haven&apos;t joined any communities yet.
          </Text>
          <TouchableOpacity
            onPress={handleDiscover}
            style={{
              backgroundColor: Colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'DMSans_600SemiBold',
                color: Colors.onPrimary,
              }}
            >
              Discover Communities
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )

  return (
    <FlatList
      data={communities}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={ListHeader}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom, 20) + 16,
        paddingTop: 20,
      }}
    />
  )
}
