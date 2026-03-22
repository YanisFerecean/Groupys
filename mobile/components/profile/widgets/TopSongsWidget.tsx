import { useRef, useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Audio, type AVPlaybackStatus } from 'expo-av'
import * as Haptics from 'expo-haptics'
import type { TopSong } from '@/models/ProfileCustomization'

interface TopSongsWidgetProps {
  songs?: TopSong[]
  containerColor?: string
}

export default function TopSongsWidget({ songs, containerColor }: TopSongsWidgetProps) {
  const soundRef = useRef<Audio.Sound | null>(null)
  const [playingId, setPlayingId] = useState<number | string | null>(null)
  const [loadingId, setLoadingId] = useState<number | string | null>(null)

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync()
    }
  }, [])

  const handlePress = useCallback(
    async (song: TopSong, index: number) => {
      const songKey = song.id ?? `idx-${index}`

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      // Tap playing song → stop
      if (playingId === songKey) {
        await soundRef.current?.stopAsync()
        await soundRef.current?.unloadAsync()
        soundRef.current = null
        setPlayingId(null)
        return
      }

      // Stop current
      if (soundRef.current) {
        await soundRef.current.stopAsync()
        await soundRef.current.unloadAsync()
        soundRef.current = null
        setPlayingId(null)
      }

      if (!song.previewUrl || !song.previewUrl.startsWith('http')) return

      setLoadingId(songKey)
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })

        const loadPromise = Audio.Sound.createAsync(
          { uri: song.previewUrl },
          { shouldPlay: true },
          (status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              setPlayingId(null)
              soundRef.current?.unloadAsync()
              soundRef.current = null
            }
          }
        )

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Preview load timed out')), 8000)
        )

        const { sound } = await Promise.race([loadPromise, timeout])
        soundRef.current = sound
        setPlayingId(songKey)
      } catch (err) {
        console.error('Playback error:', err)
      } finally {
        setLoadingId(null)
      }
    },
    [playingId]
  )

  if (!songs?.length) return null

  return (
    <View
      className="rounded-3xl p-5 gap-4"
      style={{ backgroundColor: containerColor ?? '#eeeef0' }}
    >
      <Text className="text-sm font-extrabold uppercase tracking-widest text-on-surface-variant mb-1">
        Top Songs
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {songs.map((song, i) => {
          const songKey = song.id ?? `idx-${i}`
          const isPlaying = playingId === songKey
          const isLoading = loadingId === songKey
          const hasPreview = !!song.previewUrl

          return (
            <TouchableOpacity
              key={i}
              className="w-32 h-32 rounded-2xl overflow-hidden bg-surface-container-high shrink-0 relative"
              activeOpacity={hasPreview ? 0.85 : 1}
              onPress={() => handlePress(song, i)}
              disabled={!hasPreview}
            >
              {song.coverUrl ? (
                <Image
                  source={{ uri: song.coverUrl }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : null}

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />

              {/* Play/pause overlay */}
              {hasPreview && (
                <View className="absolute inset-0 items-center justify-center">
                  <View
                    className="w-11 h-11 rounded-full items-center justify-center"
                    style={{ backgroundColor: isPlaying ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.45)' }}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={isPlaying ? '#000' : '#fff'} />
                    ) : (
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={18}
                        color={isPlaying ? '#000' : '#fff'}
                        style={{ marginLeft: isPlaying ? 0 : 2 }}
                      />
                    )}
                  </View>
                </View>
              )}

              {/* Title + artist */}
              <View className="absolute bottom-0 left-0 right-0 p-3">
                <Text className="text-white font-bold text-sm" numberOfLines={1}>
                  {song.title}
                </Text>
                <Text className="text-white/80 text-xs" numberOfLines={1}>
                  {song.artist}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}
