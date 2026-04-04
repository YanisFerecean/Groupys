import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { useRootNavigationState, useRouter } from 'expo-router'
import { useAuth } from '@clerk/expo'
import * as Haptics from 'expo-haptics'
import { searchArtists } from '@/lib/musicSearch'
import { Colors } from '@/constants/colors'
import type { TopArtist } from '@/models/ProfileCustomization'

interface TopArtistsWidgetProps {
  artists?: TopArtist[]
  containerColor?: string
  textColor?: string
  size?: 'small' | 'normal'
}

export default function TopArtistsWidget({
  artists,
  containerColor,
  textColor,
  size = 'normal',
}: TopArtistsWidgetProps) {
  const router = useRouter()
  const rootNavigationState = useRootNavigationState()
  const navigationReadyRef = useRef(false)
  const { getToken } = useAuth()
  const [resolvingArtistKey, setResolvingArtistKey] = useState<string | null>(null)

  useEffect(() => {
    navigationReadyRef.current = !!rootNavigationState?.key
  }, [rootNavigationState?.key])

  const pushArtistRoute = (artistId: string | number) => {
    if (!navigationReadyRef.current) return false
    router.push({ pathname: '/artist/[id]', params: { id: String(artistId) } })
    return true
  }

  const handleArtistPress = async (artist: TopArtist, index: number) => {
    const key = artist.id ? String(artist.id) : `${artist.name}-${index}`
    setResolvingArtistKey(key)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      if (!navigationReadyRef.current) return

      if (artist.id) {
        pushArtistRoute(artist.id)
        return
      }

      const token = await getToken()
      const results = await searchArtists(artist.name, token, 5)
      const exact = results.find((item) => item.name.toLowerCase() === artist.name.toLowerCase())
      const resolved = exact ?? results[0]
      if (resolved?.id) {
        pushArtistRoute(resolved.id)
      }
    } catch (err) {
      console.error('Failed to resolve artist id:', err)
    } finally {
      setResolvingArtistKey(null)
    }
  }

  if (!artists?.length) return null
  const visibleArtists = artists.slice(0, size === 'small' ? 1 : 3)

  return (
    <View
      className="rounded-[28px] p-5 gap-3"
      style={{ backgroundColor: containerColor ?? 'rgba(0,0,0,0.02)' }}
    >
      <Text
        className="text-xs font-semibold uppercase tracking-widest mb-1 ml-1"
        style={{ color: textColor ?? undefined }}
      >
        {size === 'small' ? 'Top Artist' : 'Top Artists'}
      </Text>
      {size === 'small' ? (
        <TouchableOpacity
          className="items-center gap-4 py-1"
          activeOpacity={0.8}
          onPress={() => handleArtistPress(visibleArtists[0], 0)}
          disabled={resolvingArtistKey !== null}
        >
          <View className="w-full aspect-square rounded-full overflow-hidden bg-surface-container-high border-2 border-white/20">
            {visibleArtists[0]?.imageUrl ? (
              <Image
                source={{ uri: visibleArtists[0].imageUrl }}
                style={{ width: '100%', height: '100%', borderRadius: 999 }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Text className="text-5xl font-bold" style={{ color: textColor ?? undefined }}>
                  {visibleArtists[0]?.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View className="w-full items-center">
            <Text className="text-base font-bold text-center" style={{ color: textColor ?? undefined }} numberOfLines={1}>
              {visibleArtists[0]?.name}
            </Text>
            {visibleArtists[0]?.genre ? (
              <Text className="mt-1 text-sm text-center" style={{ color: textColor ?? undefined }} numberOfLines={1}>
                {visibleArtists[0].genre}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 4 }}>
          {visibleArtists.map((artist, i) => {
          const key = artist.id ? String(artist.id) : `${artist.name}-${i}`
          const isResolving = resolvingArtistKey === key
          const body = (
            <>
              <View className="w-24 h-24 rounded-full overflow-hidden bg-surface-container-high border-2 border-white/20">
                {artist.imageUrl ? (
                  <Image
                    source={{ uri: artist.imageUrl }}
                    style={{ width: '100%', height: '100%', borderRadius: 999 }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <Text className="text-3xl font-bold" style={{ color: textColor ?? undefined }}>
                      {artist.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isResolving ? (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  </View>
                ) : null}
              </View>
              <Text className="text-sm font-bold text-center" style={{ color: textColor ?? undefined }} numberOfLines={1}>
                {artist.name}
              </Text>
              {artist.genre && (
                <Text className="text-xs text-center -mt-1" style={{ color: textColor ?? undefined }} numberOfLines={1}>
                  {artist.genre}
                </Text>
              )}
            </>
          )

          return (
            <TouchableOpacity
              key={i}
              className="items-center gap-2"
              style={{ width: 96 }}
              activeOpacity={0.8}
              onPress={() => handleArtistPress(artist, i)}
              disabled={resolvingArtistKey !== null}
            >
              {body}
            </TouchableOpacity>
          )
          })}
        </ScrollView>
      )}
    </View>
  )
}
