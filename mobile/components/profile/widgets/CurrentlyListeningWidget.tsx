import { View, Text, Animated, Easing, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import { API_URL } from '@/lib/api'

function SoundWaveBar({ delay }: { delay: number }) {
  const height = useRef(new Animated.Value(4)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(height, {
          toValue: 14 + Math.random() * 8,
          duration: 400 + Math.random() * 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
          delay,
        }),
        Animated.timing(height, {
          toValue: 4,
          duration: 400 + Math.random() * 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start()
  }, [delay, height])

  return (
    <Animated.View
      style={{
        width: 3,
        height,
        backgroundColor: '#fff',
        borderRadius: 1.5,
        marginHorizontal: 1,
      }}
    />
  )
}

function SoundWaveAnimation({ color = '#fff' }: { color?: string }) {
  return (
    <View className="flex-row items-end h-6 px-1">
      <SoundWaveBar delay={0} />
      <SoundWaveBar delay={150} />
      <SoundWaveBar delay={300} />
      <SoundWaveBar delay={450} />
    </View>
  )
}

interface TrackInfo {
  title: string
  artist: string
  coverUrl?: string
}

interface CurrentlyListeningWidgetProps {
  track?: TrackInfo
  spotifyConnected?: boolean
}

const DEFAULT_COVER_SLIDE_DISTANCE = 220

function isSameSong(a: TrackInfo | null, b: TrackInfo | null): boolean {
  if (!a || !b) return false
  return (
    a.title.trim().toLowerCase() === b.title.trim().toLowerCase() &&
    a.artist.trim().toLowerCase() === b.artist.trim().toLowerCase()
  )
}

export default function CurrentlyListeningWidget({ track: manualTrack, spotifyConnected }: CurrentlyListeningWidgetProps) {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [spotifyTrack, setSpotifyTrack] = useState<TrackInfo | null>(null)
  const spotifyTrackRef = useRef<TrackInfo | null>(null)
  const [activeCoverUrl, setActiveCoverUrl] = useState<string | undefined>(undefined)
  const activeCoverUrlRef = useRef<string | undefined>(undefined)
  const [incomingCoverUrl, setIncomingCoverUrl] = useState<string | undefined>(undefined)
  const [coverSlideDistance, setCoverSlideDistance] = useState(DEFAULT_COVER_SLIDE_DISTANCE)
  const slideAnim = useRef(new Animated.Value(0)).current
  const isCoverAnimatingRef = useRef(false)

  const outgoingTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -coverSlideDistance],
  })
  const incomingTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [coverSlideDistance, 0],
  })
  const incomingOpacity = slideAnim.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0, 0, 1],
  })

  useEffect(() => {
    spotifyTrackRef.current = spotifyTrack
  }, [spotifyTrack])

  useEffect(() => {
    activeCoverUrlRef.current = activeCoverUrl
  }, [activeCoverUrl])

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    if (!spotifyConnected) {
      setSpotifyTrack(null)
      setActiveCoverUrl(undefined)
      setIncomingCoverUrl(undefined)
      slideAnim.setValue(0)
      isCoverAnimatingRef.current = false
      return
    }

    const fetchSpotify = async () => {
      try {
        const token = await getTokenRef.current()
        if (!token) return

        const res = await fetch(`${API_URL}/spotify/currently-playing`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        // Keep last known track when playback stops.
        if (res.status === 204) {
          return
        }

        if (!res.ok) {
          throw new Error(`API error ${res.status}: ${res.statusText}`)
        }

        const raw = await res.text()
        if (!raw.trim()) {
          return
        }

        const data = JSON.parse(raw) as TrackInfo | null
        if (data?.title) {
          const prev = spotifyTrackRef.current
          if (isSameSong(prev, data)) return

          const prevCover = activeCoverUrlRef.current ?? prev?.coverUrl
          const nextCover = data.coverUrl
          if (isCoverAnimatingRef.current) {
            return
          }

          const shouldAnimateCoverSwap =
            !!prev?.title &&
            !!prevCover &&
            !!nextCover &&
            prevCover !== nextCover

          if (shouldAnimateCoverSwap) {
            isCoverAnimatingRef.current = true
            setIncomingCoverUrl(nextCover)
            slideAnim.stopAnimation(() => {
              slideAnim.setValue(0)

              Animated.timing(slideAnim, {
                toValue: 1,
                duration: 420,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }).start(() => {
                setSpotifyTrack(data)
                spotifyTrackRef.current = data
                setActiveCoverUrl(data.coverUrl)
                setIncomingCoverUrl(undefined)
                slideAnim.setValue(0)
                isCoverAnimatingRef.current = false
              })
            })
            return
          }

          setSpotifyTrack(data)
          spotifyTrackRef.current = data
          setActiveCoverUrl(data.coverUrl)
        }
      } catch (err) {
        console.error('Failed to fetch Spotify status:', err)
      }
    }

    fetchSpotify()
    const interval = setInterval(fetchSpotify, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [spotifyConnected, slideAnim])

  const track = spotifyConnected ? spotifyTrack : manualTrack
  const isCurrentlyPlaying = !!spotifyTrack?.title
  const displayCoverUrl = spotifyConnected ? (activeCoverUrl ?? track?.coverUrl) : track?.coverUrl
  if (!track?.title) return null

  return (
    <View className="rounded-[28px] overflow-hidden bg-surface-container-lowest">
      {displayCoverUrl ? (
        <View
          className="h-40"
          onLayout={(event) => {
            const width = Math.round(event.nativeEvent.layout.width)
            if (width > 0 && width !== coverSlideDistance) {
              setCoverSlideDistance(width)
            }
          }}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                transform: [{ translateX: outgoingTranslateX }],
              },
            ]}
          >
            <Image
              source={{ uri: displayCoverUrl }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </Animated.View>
          {incomingCoverUrl ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  opacity: incomingOpacity,
                  transform: [{ translateX: incomingTranslateX }],
                },
              ]}
            >
              <Image
                source={{ uri: incomingCoverUrl }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </Animated.View>
          ) : null}
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.45)']}
            className="absolute inset-0"
          />
          <View className="absolute bottom-0 left-0 right-0 p-5 flex-row items-end justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-white/70 text-[10px] font-semibold uppercase tracking-widest mb-1">
                Currently Listening
              </Text>
              <Text className="text-white font-bold text-lg mb-0.5" numberOfLines={1}>
                {track.title}
              </Text>
              <Text className="text-white/85 text-[15px]" numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
            <View className="pb-1">
              {isCurrentlyPlaying ? (
                <SoundWaveAnimation color="#fff" />
              ) : (
                <Ionicons name="pause" size={20} color="#fff" />
              )}
            </View>
          </View>
        </View>
      ) : (
        <View className="p-4 flex-row items-center gap-4">
          <View className="w-14 h-14 rounded-2xl bg-surface-container items-center justify-center shrink-0">
            <Ionicons name="musical-notes" size={24} color="#888" />
          </View>
          <View className="flex-1 min-w-0 justify-center">
            <Text className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">
              Currently Listening
            </Text>
            <Text className="text-[17px] font-bold text-on-surface mb-0.5" numberOfLines={1}>
              {track.title}
            </Text>
            <Text className="text-[15px] text-on-surface-variant" numberOfLines={1}>
              {track.artist}
            </Text>
          </View>
          <View className="bg-primary/10 rounded-xl p-2 mr-1">
            {isCurrentlyPlaying ? (
              <SoundWaveAnimation color="#ba002b" />
            ) : (
              <Ionicons name="pause" size={20} color="#ba002b" />
            )}
          </View>
        </View>
      )}
    </View>
  )
}
