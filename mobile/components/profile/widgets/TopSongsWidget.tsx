import { useRef, useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, type GestureResponderEvent } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { SymbolView } from 'expo-symbols'
import { GlassView } from 'expo-glass-effect'
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { useAuth } from '@clerk/expo'
import * as Haptics from 'expo-haptics'
import { useFocusEffect } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'
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
  const isFocused = useIsFocused()
  const soundRef = useRef<AudioPlayer | null>(null)
  const loadingRef = useRef<number | string | null>(null)
  const operationRef = useRef(0)
  const [playingId, setPlayingId] = useState<number | string | null>(null)
  const [loadingId, setLoadingId] = useState<number | string | null>(null)
  // Cache resolved preview URLs so we only fetch once per song
  const previewCache = useRef<Record<string, string>>({})
  const failedPreviewUrls = useRef(new Set<string>())

  const stopPlayback = useCallback(() => {
    operationRef.current += 1
    loadingRef.current = null

    if (!soundRef.current) {
      setPlayingId(null)
      setLoadingId(null)
      return
    }

    try { soundRef.current.pause() } catch {}
    try { soundRef.current.remove() } catch {}

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

  useEffect(() => {
    if (!isFocused) {
      void stopPlayback()
    }
  }, [isFocused, stopPlayback])

  useEffect(() => {
    void stopPlayback()
  }, [size, stopPlayback])

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
    async (previewUrl: string, songKey: number | string, operationId: number): Promise<boolean> => {
      if (operationId !== operationRef.current) return false
      await setAudioModeAsync({ playsInSilentMode: true })
      if (operationId !== operationRef.current) return false

      const player = createAudioPlayer({ uri: previewUrl })

      await new Promise<void>((resolve, reject) => {
        let settled = false

        const timeoutId = setTimeout(() => {
          if (settled) return
          settled = true
          player.remove()
          reject(new Error(PREVIEW_TIMEOUT_MESSAGE))
        }, PREVIEW_LOAD_TIMEOUT_MS)

        player.addListener('playbackStatusUpdate', (status) => {
          if (!settled && status.isLoaded) {
            settled = true
            clearTimeout(timeoutId)
            resolve()
          }
          if (status.didJustFinish && soundRef.current === player) {
            setPlayingId(null)
            loadingRef.current = null
            setLoadingId(null)
            soundRef.current?.remove()
            soundRef.current = null
          }
        })
      })

      if (operationId !== operationRef.current) {
        try { player.pause() } catch {}
        try { player.remove() } catch {}
        return false
      }

      player.play()
      if (operationId !== operationRef.current) {
        try { player.pause() } catch {}
        try { player.remove() } catch {}
        return false
      }
      soundRef.current = player
      setPlayingId(songKey)
      return true
    },
    [],
  )

  const handlePress = useCallback(
    async (song: TopSong, index: number) => {
      const songKey = song.id ?? `idx-${index}`

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      // Ignore repeated taps while preview is resolving/loading.
      if (loadingRef.current !== null) return

      // Tap playing song → stop
      if (playingId === songKey) {
        await stopPlayback()
        return
      }

      // Stop current
      if (soundRef.current) {
        await stopPlayback()
      }

      const operationId = operationRef.current + 1
      operationRef.current = operationId
      loadingRef.current = songKey
      setLoadingId(songKey)
      try {
        const previewUrl = await resolvePreviewUrl(song)
        if (operationId !== operationRef.current) return
        if (!previewUrl) return

        try {
          const played = await playPreview(previewUrl, songKey, operationId)
          if (!played) return
        } catch (firstErr) {
          if (operationId !== operationRef.current) return
          failedPreviewUrls.current.add(previewUrl)
          const refreshedUrl = await resolvePreviewUrl(song, true)
          if (operationId !== operationRef.current) return
          if (!refreshedUrl || refreshedUrl === previewUrl) throw firstErr
          const played = await playPreview(refreshedUrl, songKey, operationId)
          if (!played) return
          previewCache.current[`${song.title}::${song.artist}`] = refreshedUrl
        }
      } catch (err) {
        if (operationId === operationRef.current && !isPreviewTimeoutError(err)) {
          console.error('Playback error:', err)
        }
      } finally {
        if (operationId === operationRef.current) {
          loadingRef.current = null
          setLoadingId(null)
        }
      }
    },
    [playingId, playPreview, resolvePreviewUrl, stopPlayback]
  )

  if (!songs?.length) return null
  const visibleSongs = songs.slice(0, size === 'small' ? 1 : 3)
  const singleSong = visibleSongs[0]
  if (!singleSong) return null
  const singleSongKey = singleSong?.id ?? 'idx-0'
  const isSinglePlaying = playingId === singleSongKey
  const isSingleLoading = loadingId === singleSongKey

  const renderPlayerButton = (
    isLoading: boolean,
    isPlaying: boolean,
    onPress: () => void,
    glassKey: string,
  ) => {
    const iconName = isPlaying ? 'pause.fill' : 'play.fill'
    return (
      <GlassView
        key={glassKey}
        isInteractive
        style={{
          borderRadius: 22,
        }}
      >
        <TouchableOpacity
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation()
            onPress()
          }}
          activeOpacity={0.85}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <SymbolView name={iconName} size={18} tintColor={Colors.primary} />
          )}
        </TouchableOpacity>
      </GlassView>
    )
  }

  return (
    <View
      className="rounded-[28px] p-5 gap-3"
      style={{ backgroundColor: containerColor ?? 'rgba(0,0,0,0.02)' }}
    >
      <Text
        className="text-sm font-extrabold uppercase tracking-widest mb-1 ml-1"
        style={{ color: textColor ?? undefined }}
      >
        {size === 'small' ? 'Top Song' : 'Top Songs'}
      </Text>
      {size === 'small' ? (
        <TouchableOpacity
          className="gap-3"
          activeOpacity={0.85}
          onPress={() => handlePress(singleSong, 0)}
        >
          <View className="aspect-square rounded-3xl overflow-hidden bg-surface-container-high relative">
            {singleSong?.coverUrl ? (
              <Image
                source={{ uri: singleSong.coverUrl }}
                style={{ position: 'absolute', top: -4, left: -4, right: -4, bottom: -4 }}
                contentFit="cover"
              />
            ) : null}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              locations={[0.4, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View
              className="absolute left-3 top-3 h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              <Text className="text-xs font-bold text-white">1</Text>
            </View>

            <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
              {renderPlayerButton(
                isSingleLoading,
                isSinglePlaying,
                () => { void handlePress(singleSong, 0) },
                `small-${singleSongKey}-${isSingleLoading ? 'loading' : 'idle'}-${isSinglePlaying ? 'playing' : 'paused'}`,
              )}
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
              className="w-[140px] h-[140px] rounded-3xl overflow-hidden bg-surface-container-high shrink-0 relative"
              activeOpacity={0.85}
              onPress={() => handlePress(song, i)}
            >
              {song.coverUrl ? (
                <Image
                  source={{ uri: song.coverUrl }}
                  style={{ position: 'absolute', top: -4, left: -4, right: -4, bottom: -4 }}
                  contentFit="cover"
                />
              ) : null}

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                locations={[0.4, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />

              {/* Play/pause overlay */}
              <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
                {renderPlayerButton(
                  isLoading,
                  isPlaying,
                  () => { void handlePress(song, i) },
                  `normal-${songKey}-${isLoading ? 'loading' : 'idle'}-${isPlaying ? 'playing' : 'paused'}`,
                )}
              </View>

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
