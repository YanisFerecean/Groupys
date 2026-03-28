import { useRef, useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Audio, type AVPlaybackStatus } from 'expo-av'
import { useAuth } from '@clerk/expo'
import * as Haptics from 'expo-haptics'
import { useFocusEffect } from 'expo-router'
import { searchTracks } from '@/lib/musicSearch'
import { Colors } from '@/constants/colors'
import type { TopSong } from '@/models/ProfileCustomization'

const PREVIEW_LOAD_TIMEOUT_MS = 12000
const PREVIEW_TIMEOUT_MESSAGE = 'Preview load timed out'

interface TopSongsWidgetProps {
  songs?: TopSong[]
  containerColor?: string
  textColor?: string
  size?: 'small' | 'normal'
}

function isPreviewTimeoutError(error: unknown) {
  return error instanceof Error && error.message === PREVIEW_TIMEOUT_MESSAGE
}

export default function TopSongsWidget({
  songs,
  containerColor,
  textColor,
  size = 'normal',
}: TopSongsWidgetProps) {
  const { getToken } = useAuth()
  const soundRef = useRef<Audio.Sound | null>(null)
  const [playingId, setPlayingId] = useState<number | string | null>(null)
  const [loadingId, setLoadingId] = useState<number | string | null>(null)
  // Cache resolved preview URLs so we only fetch once per song
  const previewCache = useRef<Record<string, string>>({})
  const failedPreviewUrls = useRef(new Set<string>())

  const stopPlayback = useCallback(async () => {
    if (!soundRef.current) {
      setPlayingId(null)
      setLoadingId(null)
      return
    }

    try {
      await soundRef.current.stopAsync()
    } catch {}

    try {
      await soundRef.current.unloadAsync()
    } catch {}

    soundRef.current = null
    setPlayingId(null)
    setLoadingId(null)
  }, [])

  useEffect(() => {
    return () => {
      void stopPlayback()
    }
  }, [stopPlayback])

  useFocusEffect(
    useCallback(() => {
      return () => {
        void stopPlayback()
      }
    }, [stopPlayback]),
  )

  const resolvePreviewUrl = useCallback(
    async (song: TopSong, forceRefresh = false): Promise<string | null> => {
      const cacheKey = `${song.title}::${song.artist}`
      const savedPreviewUrl = song.previewUrl?.startsWith('http') ? song.previewUrl : null

      if (
        savedPreviewUrl &&
        !forceRefresh &&
        !failedPreviewUrls.current.has(savedPreviewUrl)
      ) {
        return savedPreviewUrl
      }

      const cachedPreview = previewCache.current[cacheKey]
      if (
        cachedPreview &&
        !forceRefresh &&
        !failedPreviewUrls.current.has(cachedPreview)
      ) {
        return cachedPreview
      }

      try {
        const token = await getToken()
        const primaryQuery = `${song.title} ${song.artist}`.trim()
        const primaryResults = await searchTracks(primaryQuery, token, 5)
        const primaryMatch = primaryResults.find(
          (r) =>
            r.title.toLowerCase() === song.title.toLowerCase() &&
            r.artist.toLowerCase() === song.artist.toLowerCase(),
        ) ?? primaryResults[0]

        if (
          primaryMatch?.preview?.startsWith('http') &&
          !failedPreviewUrls.current.has(primaryMatch.preview)
        ) {
          previewCache.current[cacheKey] = primaryMatch.preview
          return primaryMatch.preview
        }

        const fallbackResults = await searchTracks(song.title, token, 5)
        const fallbackMatch = fallbackResults.find(
          (r) => r.artist.toLowerCase() === song.artist.toLowerCase(),
        ) ?? fallbackResults[0]

        if (
          fallbackMatch?.preview?.startsWith('http') &&
          !failedPreviewUrls.current.has(fallbackMatch.preview)
        ) {
          previewCache.current[cacheKey] = fallbackMatch.preview
          return fallbackMatch.preview
        }
      } catch (err) {
        console.error('Preview resolve error:', err)
      }
      return null
    },
    [getToken],
  )

  const playPreview = useCallback(
    async (previewUrl: string, songKey: number | string) => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })

      const sound = new Audio.Sound()
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingId(null)
            soundRef.current?.unloadAsync()
            soundRef.current = null
          }
        })

      let timeoutId: ReturnType<typeof setTimeout> | null = null

      try {
        await Promise.race([
          sound.loadAsync({ uri: previewUrl }, { shouldPlay: false }),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(PREVIEW_TIMEOUT_MESSAGE)), PREVIEW_LOAD_TIMEOUT_MS)
          }),
        ])
        await sound.playAsync()
      } catch (error) {
        await sound.unloadAsync().catch(() => undefined)
        throw error
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }

      soundRef.current = sound
      setPlayingId(songKey)
    },
    [],
  )

  const handlePress = useCallback(
    async (song: TopSong, index: number) => {
      const songKey = song.id ?? `idx-${index}`

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      // Tap playing song → stop
      if (playingId === songKey) {
        await stopPlayback()
        return
      }

      // Stop current
      if (soundRef.current) {
        await stopPlayback()
      }

      setLoadingId(songKey)
      try {
        const previewUrl = await resolvePreviewUrl(song)
        if (!previewUrl) return

        try {
          await playPreview(previewUrl, songKey)
        } catch (firstErr) {
          failedPreviewUrls.current.add(previewUrl)
          const refreshedUrl = await resolvePreviewUrl(song, true)
          if (!refreshedUrl || refreshedUrl === previewUrl) throw firstErr
          await playPreview(refreshedUrl, songKey)
          previewCache.current[`${song.title}::${song.artist}`] = refreshedUrl
        }
      } catch (err) {
        if (!isPreviewTimeoutError(err)) {
          console.error('Playback error:', err)
        }
      } finally {
        setLoadingId(null)
      }
    },
    [playingId, playPreview, resolvePreviewUrl, stopPlayback]
  )

  if (!songs?.length) return null
  const visibleSongs = songs.slice(0, size === 'small' ? 1 : 3)

  return (
    <View
      className="rounded-[28px] p-5 gap-3"
      style={{ backgroundColor: containerColor ?? 'rgba(0,0,0,0.02)' }}
    >
      <Text
        className="text-xs font-semibold uppercase tracking-widest mb-1 ml-1"
        style={{ color: textColor ?? undefined }}
      >
        {size === 'small' ? 'Top Song' : 'Top Songs'}
      </Text>
      {size === 'small' ? (
        <TouchableOpacity
          className="gap-3"
          activeOpacity={0.85}
          onPress={() => handlePress(visibleSongs[0], 0)}
        >
          <View className="aspect-square rounded-3xl overflow-hidden bg-surface-container-high relative">
            {visibleSongs[0]?.coverUrl ? (
              <Image
                source={{ uri: visibleSongs[0].coverUrl }}
                style={{ position: 'absolute', top: '-2%', left: '-2%', width: '104%', height: '104%' }}
                contentFit="cover"
              />
            ) : null}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View
              className="absolute left-3 top-3 h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              <Text className="text-xs font-bold text-white">1</Text>
            </View>
          </View>

          <View className="px-1">
            <Text className="text-[16px] font-bold text-on-surface" style={{ color: textColor ?? undefined }} numberOfLines={1}>
              {visibleSongs[0]?.title}
            </Text>
            <Text className="mt-1 text-sm text-on-surface-variant" style={{ color: textColor ?? undefined }} numberOfLines={1}>
              {visibleSongs[0]?.artist}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {visibleSongs.map((song, i) => {
          const songKey = song.id ?? `idx-${i}`
          const isPlaying = playingId === songKey
          const isLoading = loadingId === songKey

          return (
            <TouchableOpacity
              key={i}
              className="w-[140px] h-[140px] rounded-3xl overflow-hidden bg-surface-container-high shrink-0 relative border border-black/5"
              activeOpacity={0.85}
              onPress={() => handlePress(song, i)}
            >
              {song.coverUrl ? (
                <Image
                  source={{ uri: song.coverUrl }}
                  style={{ position: 'absolute', top: '-2%', left: '-2%', width: '104%', height: '104%' }}
                  contentFit="cover"
                />
              ) : null}

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />

              {/* Play/pause overlay */}
              {(isPlaying || isLoading) && (
                <View className="absolute inset-0 items-center justify-center">
                  <View
                    className="w-11 h-11 rounded-full items-center justify-center"
                    style={{ backgroundColor: isPlaying ? Colors.primary : 'rgba(186,0,43,0.6)' }}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name="pause"
                        size={18}
                        color="#fff"
                      />
                    )}
                  </View>
                </View>
              )}

              {/* Title + artist */}
              <View className="absolute bottom-0 left-0 right-0 p-3 pt-6">
                <Text className="text-white font-bold text-[15px]" numberOfLines={1} style={{ lineHeight: 18 }}>
                  {song.title}
                </Text>
                <Text className="text-white/80 text-[13px]" numberOfLines={1}>
                  {song.artist}
                </Text>
              </View>
            </TouchableOpacity>
          )
          })}
        </ScrollView>
      )}
    </View>
  )
}
