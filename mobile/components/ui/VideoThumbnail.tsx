import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, View } from 'react-native'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { useVideoPlayer, VideoView } from 'expo-video'
import { setAudioModeAsync } from 'expo-audio'
import { Colors } from '@/constants/colors'
import { useAuthToken } from '@/hooks/useAuthToken'

interface VideoThumbnailProps {
  url: string
  width: number | string
  height?: number | string
  autoplay?: boolean
  isActive?: boolean
  showPlaybackOverlay?: boolean
  muted?: boolean
  loop?: boolean
  contentFit?: 'cover' | 'contain'
  adaptiveFitByOrientation?: boolean
  portraitContentFit?: 'cover' | 'contain'
  landscapeContentFit?: 'cover' | 'contain'
  rounded?: boolean
}

let hasConfiguredAutoplayAudio = false

export default function VideoThumbnail({
  url,
  width,
  height = 200,
  autoplay = false,
  isActive = false,
  showPlaybackOverlay = true,
  muted = true,
  loop = true,
  contentFit = 'cover',
  adaptiveFitByOrientation = false,
  portraitContentFit = 'cover',
  landscapeContentFit = 'contain',
  rounded = true,
}: VideoThumbnailProps) {
  const { token, refreshToken } = useAuthToken()
  const [thumbUri, setThumbUri] = useState<string | null>(null)
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null)
  const authRetryInFlightRef = useRef(false)
  const authRetryCountRef = useRef(0)

  const player = useVideoPlayer(
    autoplay ? { uri: url, headers: token ? { Authorization: `Bearer ${token}` } : undefined } : null,
    (player) => {
      player.loop = loop
      player.muted = muted
      player.pause()
    },
  )

  useEffect(() => {
    if (!autoplay || muted || hasConfiguredAutoplayAudio) return
    let isMounted = true
    setAudioModeAsync({ playsInSilentMode: true })
      .then(() => {
        if (isMounted) {
          hasConfiguredAutoplayAudio = true
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [autoplay, muted])

  useEffect(() => {
    authRetryCountRef.current = 0
    authRetryInFlightRef.current = false
  }, [url])

  const isUnauthorizedMediaError = useCallback((message?: string) => {
    if (!message) return false
    const normalized = message.toLowerCase()
    return normalized.includes('401') || normalized.includes('unauthorized')
  }, [])

  const recoverFromUnauthorized = useCallback(async () => {
    if (!autoplay || !player) return
    if (authRetryInFlightRef.current) return
    if (authRetryCountRef.current >= 1) return

    authRetryInFlightRef.current = true
    authRetryCountRef.current += 1
    try {
      const refreshed = await refreshToken()
      if (!refreshed) return
      await player.replaceAsync({
        uri: url,
        headers: { Authorization: `Bearer ${refreshed}` },
      })
      player.loop = loop
      player.muted = muted
      if (isActive) {
        player.play()
      } else {
        player.pause()
      }
    } catch (error) {
      console.error('[video] failed to recover unauthorized source', error)
    } finally {
      authRetryInFlightRef.current = false
    }
  }, [autoplay, isActive, loop, muted, player, refreshToken, url])

  useEffect(() => {
    if (!player) return
    player.muted = muted
  }, [muted, player])

  useEffect(() => {
    if (!player) return
    player.loop = loop
  }, [loop, player])

  useEffect(() => {
    if (!autoplay || !player) return
    if (isActive) {
      const duration = Number.isFinite(player.duration) ? player.duration : 0
      if (duration > 0 && player.currentTime >= duration - 0.05) {
        player.currentTime = 0
      }
      player.play()
    } else {
      player.pause()
    }
  }, [autoplay, isActive, player])

  useEffect(() => {
    if (!autoplay || !player) return

    const restartPlayback = () => {
      try {
        player.currentTime = 0
      } catch {}
      setTimeout(() => {
        try {
          if (isActive) {
            player.play()
          }
        } catch {}
      }, 0)
    }

    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error' && isUnauthorizedMediaError(error?.message)) {
        void recoverFromUnauthorized()
        return
      }
      if (!isActive) return
      if (status !== 'readyToPlay') return
      if (!player.playing) {
        const duration = Number.isFinite(player.duration) ? player.duration : 0
        if (duration > 0 && player.currentTime >= duration - 0.05) {
          restartPlayback()
          return
        }
        player.play()
      }
    })

    const playToEndSub = player.addListener('playToEnd', () => {
      if (!isActive || !loop) return
      restartPlayback()
    })

    return () => {
      statusSub.remove()
      playToEndSub.remove()
    }
  }, [autoplay, isActive, isUnauthorizedMediaError, loop, player, recoverFromUnauthorized])

  useEffect(() => {
    if (!adaptiveFitByOrientation || !autoplay || !player) return
    setVideoSize(null)

    const updateFromTracks = (tracks: { size?: { width?: number; height?: number } }[]) => {
      const trackWithSize = tracks.find((track) => {
        const width = track?.size?.width ?? 0
        const height = track?.size?.height ?? 0
        return width > 0 && height > 0
      })
      if (!trackWithSize?.size) return
      const width = trackWithSize.size.width ?? 0
      const height = trackWithSize.size.height ?? 0
      if (width <= 0 || height <= 0) return
      setVideoSize((current) => {
        if (current?.width === width && current?.height === height) return current
        return { width, height }
      })
    }

    updateFromTracks(player.availableVideoTracks as { size?: { width?: number; height?: number } }[])

    const sourceLoadSub = player.addListener('sourceLoad', (payload) => {
      updateFromTracks(payload.availableVideoTracks as { size?: { width?: number; height?: number } }[])
    })
    const videoTrackSub = player.addListener('videoTrackChange', (payload) => {
      updateFromTracks([payload.videoTrack as { size?: { width?: number; height?: number } }])
    })

    return () => {
      sourceLoadSub.remove()
      videoTrackSub.remove()
    }
  }, [adaptiveFitByOrientation, autoplay, player, url])

  useEffect(() => {
    if (autoplay) {
      setThumbUri(null)
      return
    }

    let cancelled = false

    const loadThumbnail = async (authToken: string | null, allowRetry: boolean) => {
      try {
        const result = await VideoThumbnails.getThumbnailAsync(url, {
          time: 0,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        })
        if (cancelled) return
        setThumbUri(result.uri)
        if (adaptiveFitByOrientation && result.width > 0 && result.height > 0) {
          setVideoSize({ width: result.width, height: result.height })
        }
      } catch (error) {
        if (!allowRetry) return
        const message = error instanceof Error ? error.message : String(error)
        if (!isUnauthorizedMediaError(message)) return
        const refreshed = await refreshToken()
        if (!refreshed || cancelled) return
        await loadThumbnail(refreshed, false)
      }
    }

    void loadThumbnail(token, true)

    return () => {
      cancelled = true
    }
  }, [adaptiveFitByOrientation, autoplay, isUnauthorizedMediaError, refreshToken, token, url])

  const resolvedContentFit =
    adaptiveFitByOrientation && videoSize
      ? videoSize.height > videoSize.width
        ? portraitContentFit
        : landscapeContentFit
      : contentFit

  return (
    <View
      style={{ width: width, height } as any}
      className={`${rounded ? 'rounded-xl' : ''} overflow-hidden bg-surface-container-high`}
    >
      {autoplay && player ? (
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit={resolvedContentFit}
          nativeControls={false}
        />
      ) : thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={resolvedContentFit === 'contain' ? 'contain' : 'cover'}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="videocam" size={32} color={Colors.onSurfaceVariant} />
        </View>
      )}

      {showPlaybackOverlay && !autoplay ? (
        <View className="absolute inset-0 items-center justify-center">
          <View className="w-12 h-12 rounded-full bg-black/50 items-center justify-center border border-white/30">
            <Ionicons name="play" size={22} color="white" style={{ marginLeft: 3 }} />
          </View>
        </View>
      ) : null}
    </View>
  )
}
