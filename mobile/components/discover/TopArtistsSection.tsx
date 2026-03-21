import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, Text, TouchableOpacity, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAuth } from '@clerk/expo'
import { router } from 'expo-router'
import { apiFetch } from '@/lib/api'
import type { ArtistRes as ChartArtist } from '@/models/ArtistRes'

export type { ChartArtist }

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function ArtistBubble({ artist }: { artist: ChartArtist }) {
  const imageUrl =
    artist.images.find((img) => img.includes('300x300')) ||
    artist.images[artist.images.length - 1] ||
    `https://picsum.photos/seed/${artist.id}/300/300`

  return (
    <TouchableOpacity
      className="flex-1 items-center gap-2"
      activeOpacity={0.75}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        router.push({ pathname: '/artist/[id]', params: { id: artist.id } })
      }}
    >
      <View className="w-28 h-28 rounded-full overflow-hidden bg-white/10">
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      <Text className="text-on-surface font-bold text-sm text-center" numberOfLines={1}>
        {artist.name}
      </Text>
      <Text className="text-on-surface-variant text-xs">
        {formatCount(artist.listeners)} listeners
      </Text>
    </TouchableOpacity>
  )
}

function SkeletonPulse({ width, height, borderRadius }: { width: number; height: number; borderRadius: number }) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#e2e2e4',
        opacity,
      }}
    />
  )
}

function ArtistSkeleton({ delay }: { delay: number }) {
  const translateY = useRef(new Animated.Value(20)).current
  const fadeIn = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 6 }),
      ]).start()
    }, delay)
    return () => clearTimeout(timeout)
  }, [fadeIn, translateY, delay])

  return (
    <Animated.View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 8,
        opacity: fadeIn,
        transform: [{ translateY }],
      }}
    >
      <SkeletonPulse width={112} height={112} borderRadius={56} />
      <SkeletonPulse width={64} height={14} borderRadius={7} />
      <SkeletonPulse width={48} height={10} borderRadius={5} />
    </Animated.View>
  )
}

export function TopArtistsSkeleton() {
  return (
    <View style={{ flexDirection: 'row', marginTop: 20, gap: 12, paddingHorizontal: 20 }}>
      <ArtistSkeleton delay={0} />
      <ArtistSkeleton delay={120} />
      <ArtistSkeleton delay={240} />
    </View>
  )
}

export function useTopArtists() {
  const { getToken } = useAuth()
  const [artists, setArtists] = useState<ChartArtist[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const data = await apiFetch<ChartArtist[]>('/charts/artists/global', token)
        if (!cancelled) setArtists(data.slice(0, 6))
      } catch (err) {
        console.error('Failed to fetch top artists:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [getToken])

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  return { artists, expanded, loading, toggleExpand }
}

function ExpandableRow({ artists }: { artists: ChartArtist[] }) {
  const fadeIn = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start()
  }, [fadeIn, translateY])

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
        paddingHorizontal: 20,
        opacity: fadeIn,
        transform: [{ translateY }],
      }}
    >
      {artists.map((artist) => (
        <ArtistBubble key={artist.id} artist={artist} />
      ))}
    </Animated.View>
  )
}

export function TopArtistRows({ artists, expanded }: { artists: ChartArtist[]; expanded: boolean }) {
  if (artists.length === 0) return null

  return (
    <>
      <View className="flex-row mt-5 gap-3 px-5">
        {artists.slice(0, 3).map((artist) => (
          <ArtistBubble key={artist.id} artist={artist} />
        ))}
      </View>

      {expanded && artists.length > 3 && (
        <ExpandableRow artists={artists.slice(3, 6)} />
      )}
    </>
  )
}
