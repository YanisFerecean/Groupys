import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Audio, AVPlaybackStatus } from 'expo-av'
import { apiFetch } from '@/lib/api'
import { Colors } from '@/constants/colors'
import type { ArtistRes as ChartArtist } from '@/models/ArtistRes'
import type { TrackRes } from '@/models/TrackRes'
import CommunityCard from '@/components/discover/CommunityCard'
import type { Community } from '@/models/Community'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const COMMUNITY_PALETTES = [
  { color: '#7c3aed', icon: 'disc' },
  { color: '#be185d', icon: 'heart' },
  { color: '#0891b2', icon: 'musical-notes' },
  { color: '#b45309', icon: 'flame' },
  { color: '#059669', icon: 'volume-high' },
  { color: '#6366f1', icon: 'star' },
]

function buildArtistCommunities(artist: ChartArtist): Community[] {
  const seed = artist.id % COMMUNITY_PALETTES.length
  const pick = (offset: number) => COMMUNITY_PALETTES[(seed + offset) % COMMUNITY_PALETTES.length]

  return [
    {
      id: `${artist.id}-fans`,
      name: `${artist.name} Fans`,
      tagline: 'The official fan hub',
      members: 8400 + (artist.id * 317) % 40000,
      color: pick(0).color,
      icon: pick(0).icon,
      isLive: artist.listeners % 3 === 0,
    },
    {
      id: `${artist.id}-discuss`,
      name: 'Deep Cuts',
      tagline: `Rare tracks & B-sides`,
      members: 2100 + (artist.id * 211) % 12000,
      color: pick(1).color,
      icon: pick(1).icon,
      isLive: false,
    },
    {
      id: `${artist.id}-covers`,
      name: 'Cover Sessions',
      tagline: 'Fan covers & remixes',
      members: 1300 + (artist.id * 173) % 8000,
      color: pick(2).color,
      icon: pick(2).icon,
      isLive: artist.playcount % 5 === 0,
    },
    {
      id: `${artist.id}-setlists`,
      name: 'Live & Setlists',
      tagline: 'Tours, shows & bootlegs',
      members: 4700 + (artist.id * 251) % 20000,
      color: pick(3).color,
      icon: pick(3).icon,
      isLive: false,
    },
  ]
}

function AnimatedExpandRow({ children }: { children: React.ReactNode }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-12)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start()
  }, [fadeAnim, translateY])

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  )
}

function TrackRow({
  track,
  index,
  isPlaying,
  isLoading,
  onPress,
}: {
  track: TrackRes
  index: number
  isPlaying: boolean
  isLoading: boolean
  onPress: () => void
}) {
  const albumCover = track.album?.coverSmall || track.album?.coverMedium
  const spinAnim = useRef(new Animated.Value(0)).current
  const spinRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (isPlaying) {
      spinRef.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1800, useNativeDriver: true })
      )
      spinRef.current.start()
    } else {
      spinRef.current?.stop()
      spinAnim.setValue(0)
    }
  }, [isPlaying, spinAnim])

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 py-3"
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Index / play indicator */}
      <View className="w-5 items-center justify-center">
        {isLoading ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={16} color={Colors.primary} />
          </Animated.View>
        ) : isPlaying ? (
          <Ionicons name="pause" size={16} color={Colors.primary} />
        ) : (
          <Text className="text-on-surface-variant text-sm text-center">{index + 1}</Text>
        )}
      </View>

      {albumCover ? (
        <Image
          source={{ uri: albumCover }}
          className="w-11 h-11 rounded-md"
          resizeMode="cover"
        />
      ) : (
        <View className="w-11 h-11 rounded-md bg-white/10 items-center justify-center">
          <Ionicons name="musical-note" size={18} color="#888" />
        </View>
      )}

      <View className="flex-1">
        <Text
          className="text-sm font-semibold"
          style={{ color: isPlaying ? Colors.primary : undefined }}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        {track.album?.title ? (
          <Text className="text-on-surface-variant text-xs mt-0.5" numberOfLines={1}>
            {track.album.title}
          </Text>
        ) : null}
      </View>

      <Text className="text-on-surface-variant text-xs">{formatDuration(track.duration)}</Text>
    </TouchableOpacity>
  )
}

function LoadingGroupys() {
  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start()
  }, [pulseAnim])

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1.05]
  })

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1]
  })

  return (
    <View className="flex-1 items-center justify-center">
      <Animated.View style={{ transform: [{ scale }], opacity, paddingBottom: 120 }}>
        <Text className="text-5xl font-extrabold tracking-tighter" style={{ color: Colors.primary }}>
          Groupys
        </Text>
      </Animated.View>
    </View>
  )
}

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { getToken } = useAuth()
  const insets = useSafeAreaInsets()

  const [artist, setArtist] = useState<ChartArtist | null>(null)
  const [tracks, setTracks] = useState<TrackRes[]>([])
  const [loading, setLoading] = useState(true)
  const [tracksLoading, setTracksLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [communitiesExpanded, setCommunitiesExpanded] = useState(false)

  const [playingId, setPlayingId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(24)).current

  // Fetch artist + top tracks
  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const [artistData, tracksData] = await Promise.all([
          apiFetch<ChartArtist>(`/artists/${id}`, token),
          apiFetch<TrackRes[]>(`/artists/${id}/top-tracks?limit=5`, token).catch((err) => {
            console.error('Failed to fetch top tracks:', err)
            return [] as TrackRes[]
          }),
        ])
        if (!cancelled) {
          setArtist(artistData)
          setTracks(tracksData)
        }
      } catch (err) {
        console.error('Failed to fetch artist:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setTracksLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [id, getToken])

  // Fade-in after load
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start()
    }
  }, [loading, fadeAnim, slideAnim])

  // Stop & unload sound on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync()
    }
  }, [])

  const handleTrackPress = useCallback(
    async (track: TrackRes) => {
      // Tap playing track → stop
      if (playingId === track.id) {
        await soundRef.current?.stopAsync()
        await soundRef.current?.unloadAsync()
        soundRef.current = null
        setPlayingId(null)
        return
      }

      // Stop current sound if any
      if (soundRef.current) {
        await soundRef.current.stopAsync()
        await soundRef.current.unloadAsync()
        soundRef.current = null
        setPlayingId(null)
      }

      if (!track.preview || !track.preview.startsWith('http')) return

      setLoadingId(track.id)
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
        const { sound } = await Audio.Sound.createAsync(
          { uri: track.preview },
          { shouldPlay: true },
          (status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              setPlayingId(null)
              soundRef.current?.unloadAsync()
              soundRef.current = null
            }
          }
        )
        soundRef.current = sound
        setPlayingId(track.id)
      } catch (err) {
        console.error('Playback error:', err)
      } finally {
        setLoadingId(null)
      }
    },
    [playingId]
  )

  const visibleTracks = expanded ? tracks.slice(0, 5) : tracks.slice(0, 3)
  const canExpand = tracks.length > 3

  const heroImage =
    artist?.images[artist.images.length - 1] ||
    artist?.images.find((img) => img.includes('300x300')) ||
    null

  return (
    <View className="flex-1 bg-surface">
      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.navigate('/(home)/(discover)')}
        className="absolute z-10 left-5 items-center justify-center w-9 h-9 rounded-full bg-black/30"
        style={{ top: insets.top + 8 }}
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>

      {loading ? (
        <LoadingGroupys />
      ) : artist ? (
        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View className="relative" style={{ height: 320 }}>
              {heroImage ? (
                <Image source={{ uri: heroImage }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="w-full h-full bg-white/10 items-center justify-center">
                  <Ionicons name="person" size={64} color="#888" />
                </View>
              )}
              <View
                className="absolute bottom-0 left-0 right-0 px-5 pb-5"
                style={{ paddingTop: 80, backgroundColor: 'rgba(0,0,0,0.45)' }}
              >
                <Text className="text-white text-3xl font-extrabold tracking-tight" numberOfLines={1}>
                  {artist.name}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row px-5 pt-5 gap-6">
              <View>
                <Text className="text-primary font-extrabold text-xl">
                  {formatCount(artist.listeners)}
                </Text>
                <Text className="text-on-surface-variant text-xs mt-0.5">listeners</Text>
              </View>
              <View className="w-px bg-white/10" />
              <View>
                <Text className="text-primary font-extrabold text-xl">
                  {formatCount(artist.playcount)}
                </Text>
                <Text className="text-on-surface-variant text-xs mt-0.5">plays</Text>
              </View>
            </View>

            {/* Communities */}
            <View className="px-5 pt-8 pb-2">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-on-surface font-bold text-base">Communities</Text>
                <TouchableOpacity
                  onPress={() => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.create(280, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
                    )
                    setCommunitiesExpanded((e) => !e)
                  }}
                >
                  <Text className="text-primary text-sm font-semibold">
                    {communitiesExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="gap-3">
                <View className="flex-row gap-3">
                  {buildArtistCommunities(artist).slice(0, 2).map((community) => (
                    <CommunityCard key={community.id} community={community} />
                  ))}
                </View>
                {communitiesExpanded && (
                  <AnimatedExpandRow>
                    <View className="flex-row gap-3">
                      {buildArtistCommunities(artist).slice(2, 4).map((community) => (
                        <CommunityCard key={community.id} community={community} />
                      ))}
                    </View>
                  </AnimatedExpandRow>
                )}
              </View>
            </View>

            {/* Top Tracks */}
            <View className="px-5 pt-6">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-on-surface font-bold text-base">Top Tracks</Text>
                {canExpand && (
                  <TouchableOpacity
                    onPress={() => {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.create(280, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
                      )
                      setExpanded((e) => !e)
                    }}
                  >
                    <Text className="text-primary text-sm font-semibold">
                      {expanded ? 'Show less' : 'Show more'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {tracksLoading ? (
                <View className="items-center py-8">
                  <Text className="text-on-surface-variant text-sm">Loading tracks...</Text>
                </View>
              ) : tracks.length === 0 ? (
                <View className="items-center py-8">
                  <Text className="text-on-surface-variant text-sm">No tracks available</Text>
                </View>
              ) : (
                <View className="mt-1">
                  {visibleTracks.map((track, i) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={i}
                      isPlaying={playingId === track.id}
                      isLoading={loadingId === track.id}
                      onPress={() => handleTrackPress(track)}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Bio */}
            {artist.summary ? (
              <View className="px-5 pt-6">
                <Text className="text-on-surface font-bold text-base mb-2">About</Text>
                <Text className="text-on-surface-variant text-sm leading-5" numberOfLines={6}>
                  {artist.summary.replace(/<[^>]*>/g, '').split('\n')[0]}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      ) : (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="alert-circle-outline" size={40} color={Colors.primary} />
          <Text className="text-on-surface font-bold text-lg mt-3">Artist not found</Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-primary">Go back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
