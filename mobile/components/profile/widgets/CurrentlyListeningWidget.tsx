import { View, Text, Animated, Easing } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/expo'
import { apiFetch } from '@/lib/api'

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

export default function CurrentlyListeningWidget({ track: manualTrack, spotifyConnected }: CurrentlyListeningWidgetProps) {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [spotifyTrack, setSpotifyTrack] = useState<TrackInfo | null>(null)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    if (!spotifyConnected) {
      setSpotifyTrack(null)
      return
    }

    const fetchSpotify = async () => {
      try {
        const token = await getTokenRef.current()
        if (!token) return
        const data = await apiFetch<TrackInfo | null>('/spotify/currently-playing', token)
        setSpotifyTrack(data)
      } catch (err) {
        console.error('Failed to fetch Spotify status:', err)
      }
    }

    fetchSpotify()
    const interval = setInterval(fetchSpotify, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [spotifyConnected])

  const track = spotifyTrack || manualTrack
  if (!track?.title) return null

  return (
    <View className="rounded-2xl overflow-hidden">
      {track.coverUrl ? (
        <View className="h-36">
          <Image
            source={{ uri: track.coverUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            className="absolute inset-0"
          />
          <View className="absolute bottom-0 left-0 right-0 p-4 flex-row items-end justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-white/70 text-sm font-extrabold uppercase tracking-wider mb-0.5">
                Currently Listening
              </Text>
              <Text className="text-white font-bold text-base" numberOfLines={1}>
                {track.title}
              </Text>
              <Text className="text-white/80 text-xs" numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
            <View className="pb-0.5">
              <SoundWaveAnimation />
            </View>
          </View>
        </View>
      ) : (
        <View className="bg-surface-container-high rounded-2xl p-4 flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-lg bg-surface-container items-center justify-center shrink-0">
            <Text className="text-2xl">🎵</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-extrabold text-on-surface-variant uppercase tracking-wider mb-0.5">
              Currently Listening
            </Text>
            <Text className="text-sm font-bold text-on-surface" numberOfLines={1}>
              {track.title}
            </Text>
            <Text className="text-xs text-on-surface-variant" numberOfLines={1}>
              {track.artist}
            </Text>
          </View>
          <View className="mr-1">
            <View style={{ transform: [{ scale: 0.8 }] }}>
              <View style={{ backgroundColor: '#222', borderRadius: 8, padding: 4 }}>
                <SoundWaveAnimation />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
