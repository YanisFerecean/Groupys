import { Colors } from '@/constants/colors'
import { fetchMyAlbumRatings, type AlbumRatingRes } from '@/lib/api'
import { useAuth, useUser } from '@clerk/expo'
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
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function to5Star(backendScore: number): number {
  return backendScore / 2
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function RatedAlbumsScreen() {
  const { width: windowWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { getToken } = useAuth()
  const useGlass = isLiquidGlassAvailable()
  const getTokenRef = useRef(getToken)

  const [ratings, setRatings] = useState<AlbumRatingRes[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const loadRatings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)
    try {
      const token = await getTokenRef.current()
      const data = await fetchMyAlbumRatings(token)
      const sorted = [...data].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      setRatings(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rated albums')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadRatings(false)
    }, [loadRatings]),
  )

  const handleOpenRating = useCallback(
    (rating: AlbumRatingRes) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      router.push({
        pathname: '/(home)/(profile)/rating',
        params: {
          albumId: String(rating.albumId),
          albumTitle: rating.albumTitle,
          albumCoverUrl: rating.albumCoverUrl ?? '',
          artistName: rating.artistName ?? '',
          currentUserId: user?.id ?? '',
          initialScore: String(rating.score),
        },
      } as never)
    },
    [user?.id],
  )

  const contentHorizontalPadding = 20
  const gridGap = 12
  const cardWidth = (windowWidth - contentHorizontalPadding * 2 - gridGap) / 2

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
              <Text className="text-[18px] font-bold text-on-surface">Rated Albums</Text>
              {!loading ? (
                <Text className="text-[12px] text-on-surface-variant" style={{ fontVariant: ['tabular-nums'] }}>
                  {ratings.length} total
                </Text>
              ) : null}
            </View>
          </GlassView>
        ) : (
          <View className="items-center">
            <Text className="text-[18px] font-bold text-on-surface">Rated Albums</Text>
            {!loading ? (
              <Text className="text-[12px] text-on-surface-variant" style={{ fontVariant: ['tabular-nums'] }}>
                {ratings.length} total
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
                <Text className="text-[13px] text-on-surface-variant">Loading ratings...</Text>
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
              onRefresh={() => { void loadRatings(true) }}
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

          {ratings.length === 0 ? (
            useGlass ? (
              <GlassView style={{ borderRadius: 24, overflow: 'hidden' }}>
                <View className="items-center gap-3 p-8">
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
                    <SymbolView name="star" size={24} tintColor={Colors.onSurfaceVariant} />
                  </View>
                  <Text className="text-[18px] font-bold text-on-surface">No rated albums yet</Text>
                  <Text className="text-center text-[14px] text-on-surface-variant">
                    Rate albums from your Top Albums widget, then they will show up here.
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
                  <SymbolView name="star" size={24} tintColor={Colors.onSurfaceVariant} />
                </View>
                <Text className="text-[18px] font-bold text-on-surface">No rated albums yet</Text>
                <Text className="text-center text-[14px] text-on-surface-variant">
                  Rate albums from your Top Albums widget, then they will show up here.
                </Text>
              </View>
            )
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }}>
              {ratings.map((rating) => {
                const score = to5Star(rating.score)
                const cardBody = (
                  <>
                    {rating.albumCoverUrl ? (
                      <Image
                        source={{ uri: rating.albumCoverUrl }}
                        style={{ width: '100%', aspectRatio: 1 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: '100%',
                          aspectRatio: 1,
                          backgroundColor: Colors.surfaceContainerHigh,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SymbolView name="music.note" size={22} tintColor={Colors.onSurfaceVariant} />
                      </View>
                    )}

                    <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 3 }}>
                      <Text className="text-[14px] font-bold text-on-surface" numberOfLines={1}>
                        {rating.albumTitle}
                      </Text>
                      <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>
                        {rating.artistName ?? 'Unknown Artist'}
                      </Text>
                      <View className="flex-row items-center gap-1.5">
                        <SymbolView name="star.fill" size={11} tintColor={Colors.primary} />
                        <Text className="text-[11px] font-semibold text-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
                          {score.toFixed(1)}/5
                        </Text>
                        <Text className="text-[11px] text-on-surface-variant">•</Text>
                        <Text className="text-[11px] text-on-surface-variant" numberOfLines={1}>
                          {formatDate(rating.updatedAt)}
                        </Text>
                      </View>
                      {rating.review ? (
                        <Text className="text-[11px] text-on-surface-variant" numberOfLines={2}>
                          {rating.review}
                        </Text>
                      ) : null}
                    </View>
                  </>
                )

                if (useGlass) {
                  return (
                    <GlassView
                      key={rating.id}
                      isInteractive
                      style={{
                        width: cardWidth,
                        borderRadius: 16,
                        overflow: 'hidden',
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleOpenRating(rating)}
                        activeOpacity={0.78}
                        style={{ width: '100%' }}
                      >
                        {cardBody}
                      </TouchableOpacity>
                    </GlassView>
                  )
                }

                return (
                  <TouchableOpacity
                    key={rating.id}
                    onPress={() => handleOpenRating(rating)}
                    activeOpacity={0.78}
                    style={{
                      width: cardWidth,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor: Colors.surfaceContainerLow,
                      borderWidth: 1,
                      borderColor: Colors.outlineVariant,
                    }}
                  >
                    {cardBody}
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
