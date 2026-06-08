import { Colors } from '@/constants/colors'
import { fetchMyFriends, type FriendRes } from '@/lib/api'
import { useAuth } from '@clerk/expo'
import { Image } from 'expo-image'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { router, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { SymbolView } from 'expo-symbols'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function FriendsScreen() {
  const insets = useSafeAreaInsets()
  const { getToken } = useAuth()
  const useGlass = isLiquidGlassAvailable()
  const getTokenRef = useRef(getToken)

  const [friends, setFriends] = useState<FriendRes[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const loadFriends = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)
    try {
      const token = await getTokenRef.current()
      const data = await fetchMyFriends(token)
      const accepted = data.filter((f) => f.status === 'ACCEPTED')
      const sorted = [...accepted].sort((a, b) =>
        (a.displayName ?? a.username).localeCompare(b.displayName ?? b.username),
      )
      setFriends(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadFriends(false)
    }, [loadFriends]),
  )

  const handleOpenFriend = useCallback((friend: FriendRes) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/(home)/(profile)/user/${friend.userId}` as never)
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: useGlass ? 'transparent' : Colors.surface }}>
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
      >
        {useGlass ? (
          <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <SymbolView name="chevron.left" size={20} tintColor={Colors.onSurface} />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-low"
            activeOpacity={0.7}
          >
            <SymbolView name="chevron.left" size={20} tintColor={Colors.onSurface} />
          </TouchableOpacity>
        )}

        {useGlass ? (
          <GlassView style={{ borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text className="text-[18px] font-bold text-on-surface">Friends</Text>
              {!loading ? (
                <Text className="text-[12px] text-on-surface-variant" style={{ fontVariant: ['tabular-nums'] }}>
                  {friends.length} total
                </Text>
              ) : null}
            </View>
          </GlassView>
        ) : (
          <View className="items-center">
            <Text className="text-[18px] font-bold text-on-surface">Friends</Text>
            {!loading ? (
              <Text className="text-[12px] text-on-surface-variant" style={{ fontVariant: ['tabular-nums'] }}>
                {friends.length} total
              </Text>
            ) : null}
          </View>
        )}

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center px-5">
          {useGlass ? (
            <GlassView style={{ borderRadius: 14, overflow: 'hidden' }}>
              <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14 }}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text className="text-[13px] text-on-surface-variant">Loading friends...</Text>
              </View>
            </GlassView>
          ) : (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 20, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { void loadFriends(true) }}
              tintColor={Colors.primary}
            />
          }
        >
          {error ? (
            useGlass ? (
              <GlassView style={{ borderRadius: 14, overflow: 'hidden' }}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Text className="text-[13px]" style={{ color: '#ef4444' }}>
                    {error}
                  </Text>
                </View>
              </GlassView>
            ) : (
              <View
                style={{
                  borderRadius: 14,
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.2)',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text className="text-[13px]" style={{ color: '#ef4444' }}>
                  {error}
                </Text>
              </View>
            )
          ) : null}

          {friends.length === 0 ? (
            useGlass ? (
              <GlassView style={{ borderRadius: 24, overflow: 'hidden' }}>
                <View className="items-center gap-3 p-8">
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
                    <SymbolView name="person.2" size={24} tintColor={Colors.onSurfaceVariant} />
                  </View>
                  <Text className="text-[18px] font-bold text-on-surface">No friends yet</Text>
                  <Text className="text-center text-[14px] text-on-surface-variant">
                    When you and another user accept each other&apos;s requests, they will appear here.
                  </Text>
                </View>
              </GlassView>
            ) : (
              <View
                className="items-center gap-3 rounded-[24px] p-8"
                style={{
                  backgroundColor: Colors.surfaceContainerLow,
                  borderWidth: 1,
                  borderColor: Colors.outlineVariant,
                }}
              >
                <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
                  <SymbolView name="person.2" size={24} tintColor={Colors.onSurfaceVariant} />
                </View>
                <Text className="text-[18px] font-bold text-on-surface">No friends yet</Text>
                <Text className="text-center text-[14px] text-on-surface-variant">
                  When you and another user accept each other&apos;s requests, they will appear here.
                </Text>
              </View>
            )
          ) : (
            <View style={{ gap: 12 }}>
              {friends.map((friend) => {
                const name = friend.displayName ?? friend.username
                const rowBody = (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                    {friend.profileImage ? (
                      <Image
                        source={{ uri: friend.profileImage }}
                        style={{ width: 48, height: 48, borderRadius: 24 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: Colors.surfaceContainerHigh,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text className="text-[18px] font-bold text-on-surface-variant">{initialOf(name)}</Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text className="text-[15px] font-bold text-on-surface" numberOfLines={1}>
                        {name}
                      </Text>
                      <Text className="text-[13px] text-on-surface-variant" numberOfLines={1}>
                        @{friend.username}
                      </Text>
                    </View>

                    <SymbolView name="chevron.right" size={14} tintColor={Colors.onSurfaceVariant} />
                  </View>
                )

                if (useGlass) {
                  return (
                    <GlassView
                      key={friend.friendshipId}
                      isInteractive
                      style={{ borderRadius: 16, overflow: 'hidden' }}
                    >
                      <TouchableOpacity
                        onPress={() => handleOpenFriend(friend)}
                        activeOpacity={0.78}
                        style={{ width: '100%' }}
                      >
                        {rowBody}
                      </TouchableOpacity>
                    </GlassView>
                  )
                }

                return (
                  <TouchableOpacity
                    key={friend.friendshipId}
                    onPress={() => handleOpenFriend(friend)}
                    activeOpacity={0.78}
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor: Colors.surfaceContainerLow,
                      borderWidth: 1,
                      borderColor: Colors.outlineVariant,
                    }}
                  >
                    {rowBody}
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}
