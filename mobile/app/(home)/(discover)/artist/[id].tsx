import { SymbolView } from 'expo-symbols'
import { useAuth } from '@clerk/expo'
import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router'
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
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { LinearGradient } from 'expo-linear-gradient'
import { apiFetch } from '@/lib/api'
import { formatCount } from '@/lib/timeAgo'
import { communityResToCard } from '@/lib/communityUtils'
import { Colors } from '@/constants/colors'
import CommunityCard from '@/components/discover/CommunityCard'
import type { ArtistRes as ChartArtist } from '@/models/ArtistRes'
import type { TrackRes } from '@/models/TrackRes'
import type { CommunityResDto } from '@/models/CommunityRes'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
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
      <View className="w-5 items-center justify-center">
        {isLoading ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <SymbolView name="arrow.clockwise" size={16} tintColor="rgba(186, 0, 43, 0.6)" />
          </Animated.View>
        ) : isPlaying ? (
          <SymbolView name="pause.fill" size={16} tintColor="rgba(186, 0, 43, 0.6)" />
        ) : (
          <Text className="text-on-surface-variant text-sm text-center">{index + 1}</Text>
        )}
      </View>

      {albumCover ? (
        <Image source={{ uri: albumCover }} className="w-11 h-11 rounded-md" resizeMode="cover" />
      ) : (
        <View className="w-11 h-11 rounded-md bg-white/10 items-center justify-center">
          <SymbolView name="music.note" size={18} tintColor="#888" />
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

  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1.05] })
  const opacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })

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
  const { getToken, isLoaded: isAuthLoaded } = useAuth()
  const getTokenRef = useRef(getToken)
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()

  const [artist, setArtist] = useState<ChartArtist | null>(null)
  const [tracks, setTracks] = useState<TrackRes[]>([])
  const [communities, setCommunities] = useState<CommunityResDto[]>([])
  const [loading, setLoading] = useState(true)
  const [tracksLoading, setTracksLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const [playingId, setPlayingId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const soundRef = useRef<AudioPlayer | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(24)).current

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  // Fetch artist + top tracks + communities
  useEffect(() => {
    if (!id || !isAuthLoaded) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getTokenRef.current()
        const [artistData, tracksData, communitiesData] = await Promise.all([
          apiFetch<ChartArtist>(`/artists/${id}`, token),
          apiFetch<TrackRes[]>(`/artists/${id}/top-tracks?limit=5`, token).catch(() => [] as TrackRes[]),
          apiFetch<CommunityResDto[]>(`/communities/artist/${id}`, token).catch(() => [] as CommunityResDto[]),
        ])
        if (!cancelled) {
          setArtist(artistData)
          setTracks(tracksData)
          setCommunities(communitiesData)
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
  }, [id, isAuthLoaded])

  // Fade-in after load
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start()
    }
  }, [loading, fadeAnim, slideAnim])

  const stopPlayback = useCallback(() => {
    soundRef.current?.pause()
    soundRef.current?.remove()
    soundRef.current = null
    setPlayingId(null)
    setLoadingId(null)
  }, [])

  useEffect(() => {
    return () => { stopPlayback() }
  }, [stopPlayback])

  const refreshCommunities = useCallback(async () => {
    if (!id || !isAuthLoaded) return
    try {
      const token = await getTokenRef.current()
      const communitiesData = await apiFetch<CommunityResDto[]>(
        `/communities/artist/${id}`,
        token,
      ).catch(() => [] as CommunityResDto[])
      setCommunities(communitiesData)
    } catch (err) {
      console.error('Failed to refresh communities:', err)
    }
  }, [id, isAuthLoaded])

  useFocusEffect(
    useCallback(() => {
      void refreshCommunities()
      return () => {
        stopPlayback()
      }
    }, [refreshCommunities, stopPlayback]),
  )

  const handleTrackPress = useCallback(
    async (track: TrackRes) => {
      if (playingId === track.id) {
        stopPlayback()
        return
      }

      if (soundRef.current) {
        stopPlayback()
      }

      if (!track.preview || !track.preview.startsWith('http')) return

      setLoadingId(track.id)
      try {
        await setAudioModeAsync({ playsInSilentMode: true })
        const player = createAudioPlayer({ uri: track.preview })
        player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) {
            setPlayingId(null)
            soundRef.current?.remove()
            soundRef.current = null
          }
        })
        player.play()
        soundRef.current = player
        setPlayingId(track.id)
      } catch (err) {
        console.error('Playback error:', err)
      } finally {
        setLoadingId(null)
      }
    },
    [playingId, stopPlayback]
  )

  const openCreateCommunitySheet = useCallback(() => {
    if (!artist || !id) return
    router.push({
      pathname: '/(home)/(discover)/artist/create-community',
      params: {
        artistId: id,
        artistName: artist.name,
        homeTab: '(discover)',
      },
    } as any)
  }, [artist, id])

  const openAllCommunitiesScreen = useCallback(() => {
    if (!id) return
    router.push({
      pathname: '/(home)/(discover)/artist-communities',
      params: {
        id,
        artistName: artist?.name ?? '',
      },
    } as any)
  }, [artist?.name, id])

  const visibleTracks = expanded ? tracks.slice(0, 5) : tracks.slice(0, 3)
  const canExpand = tracks.length > 3
  const communityCards = communities.map(communityResToCard)
  const previewCommunities = communityCards.slice(0, 2)

  const heroImage =
    artist?.images[artist.images.length - 1] ||
    artist?.images.find((img) => img.includes('300x300')) ||
    null

  return (
    <View className="flex-1 bg-surface">
      {/* Back button */}
      {isLiquidGlassAvailable() ? (
        <View
          className="absolute z-10"
          style={{ left: 20, top: insets.top + 8 }}
        >
          <GlassView isInteractive tintColor="rgba(186, 0, 43, 0.6)" style={{ borderRadius: 50 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 10 }}
              activeOpacity={0.7}
            >
              <SymbolView name="chevron.left" size={22} tintColor="white" />
            </TouchableOpacity>
          </GlassView>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute z-10 left-5 w-10 h-10 rounded-full items-center justify-center"
          style={{ top: insets.top + 8, backgroundColor: Colors.primary }}
          activeOpacity={0.7}
        >
          <SymbolView name="chevron.left" size={24} tintColor="white" />
        </TouchableOpacity>
      )}

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
            <View className="relative" style={{ height: screenHeight * 0.55 }}>
              <Link.AppleZoomTarget>
                {heroImage ? (
                  <Image source={{ uri: heroImage }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="w-full h-full bg-white/10 items-center justify-center">
                    <SymbolView name="person.fill" size={64} tintColor="#888" />
                  </View>
                )}
              </Link.AppleZoomTarget>
              <LinearGradient
                colors={['transparent', '#f9f9fb']}
                locations={[0.85, 1]}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: screenHeight * 2.5}}
              />
              <View
                className="absolute bottom-0 left-0 right-0 px-5 pb-4"
                style={{ paddingTop: 60 }}
              >
                <Text
                  className="text-white font-extrabold tracking-tight"
                  numberOfLines={1}
                  style={{ fontSize: 40, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
                >
                  {artist.name}
                </Text>
              </View>
            </View>

            {/* Stats - pulled up to overlap the gradient */}
            <View className="flex-row px-5 pt-2 gap-6">
              <View>
                <Text className="text-primary font-extrabold text-xl">
                  {formatCount(artist.listeners)}
                </Text>
                <Text className="text-on-surface-variant text-xs mt-0.5">Listeners</Text>
              </View>
              <View className="w-px bg-white/10" />
              <View>
                <Text className="text-primary font-extrabold text-xl">
                  {formatCount(artist.playcount)}
                </Text>
                <Text className="text-on-surface-variant text-xs mt-0.5">Plays</Text>
              </View>
            </View>

            {/* Communities */}
            <View className="px-5 pt-8 pb-2">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-on-surface font-bold text-base">Communities</Text>
                <TouchableOpacity onPress={openAllCommunitiesScreen} activeOpacity={0.7}>
                  <Text className="text-primary text-sm font-semibold">Show more</Text>
                </TouchableOpacity>
              </View>

              {communities.length === 0 ? (
                <View className="items-center py-6">
                  <SymbolView name="person.2" size={32} tintColor={Colors.onSurfaceVariant} />
                  <Text className="text-on-surface-variant text-sm mt-2">No communities yet</Text>
                  <TouchableOpacity
                    onPress={openCreateCommunitySheet}
                    className="mt-3 px-5 py-2 rounded-full flex-row items-center gap-2"
                    style={{ backgroundColor: Colors.primary }}
                    activeOpacity={0.7}
                  >
                    <SymbolView name="plus" size={18} tintColor="white" />
                    <Text className="text-white text-sm font-bold">Create One</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-3">
                  <View className="flex-row gap-3">
                    {previewCommunities.map((c) => {
                      const targetId = communities.find((dto) => dto.id === c.id || dto.name === c.name)?.id ?? c.id
                      return (
                        <CommunityCard
                          key={c.id}
                          community={c}
                          href={{ pathname: '/(home)/(discover)/community/[id]', params: { id: targetId } }}
                          replace
                          withAppleZoom
                        />
                      )
                    })}
                    {previewCommunities.length === 1 ? <View className="flex-1" /> : null}
                  </View>
                </View>
              )}
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

            {/* Bio - moved to info sheet */}
          </ScrollView>
        </Animated.View>
      ) : (
        <View className="flex-1 items-center justify-center px-10">
          <SymbolView name="exclamationmark.circle" size={40} tintColor="black" />
          <Text className="text-on-surface font-bold text-lg mt-3">Artist not found</Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-primary">Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      {artist ? (
        <>
          <View className="absolute" style={{ left: 16, bottom: 30, zIndex: 10 }}>
            {isLiquidGlassAvailable() ? (
              <GlassView isInteractive tintColor="rgba(186, 0, 43, 0.6)" style={{ borderRadius: 50 }}>
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: '/(home)/(discover)/artist/bio',
                      params: { name: artist.name, bio: artist.summary ?? '' },
                    })
                  }}
                  style={{ padding: 12 }}
                  activeOpacity={0.7}
                >
                  <SymbolView name="info" size={22} tintColor="white" />
                </TouchableOpacity>
              </GlassView>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: '/(home)/(discover)/artist/bio',
                    params: { name: artist.name, bio: artist.summary ?? '' },
                  })
                }}
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: Colors.primary }}
                activeOpacity={0.7}
              >
                <SymbolView name="info" size={22} tintColor="white" />
              </TouchableOpacity>
            )}
          </View>

          <View className="absolute" style={{ right: 16, bottom: 30, zIndex: 10 }}>
            {isLiquidGlassAvailable() ? (
              <GlassView isInteractive tintColor="rgba(186, 0, 43, 0.6)" style={{ borderRadius: 50 }}>
                <TouchableOpacity
                  onPress={openCreateCommunitySheet}
                  style={{ padding: 12 }}
                  activeOpacity={0.7}
                >
                  <SymbolView name="plus" size={22} tintColor="white" />
                </TouchableOpacity>
              </GlassView>
            ) : (
              <TouchableOpacity
                onPress={openCreateCommunitySheet}
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: Colors.primary }}
                activeOpacity={0.7}
              >
                <SymbolView name="plus" size={22} tintColor="white" />
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : null}

    </View>
  )
}
