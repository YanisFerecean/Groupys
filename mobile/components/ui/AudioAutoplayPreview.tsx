import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { SymbolView } from 'expo-symbols'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Colors } from '@/constants/colors'
import { useAuthToken } from '@/hooks/useAuthToken'

interface AudioAutoplayPreviewProps {
  url: string
  isActive: boolean
  width: number | string
  height: number | string
  onScrubStateChange?: (isScrubbing: boolean) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function AudioAutoplayPreview({
  url,
  isActive,
  width,
  height,
  onScrubStateChange,
}: AudioAutoplayPreviewProps) {
  const useGlass = isLiquidGlassAvailable()
  const { token, loading } = useAuthToken()
  const tokenRef = useRef(token)
  const onScrubStateChangeRef = useRef(onScrubStateChange)
  const playerRef = useRef<AudioPlayer | null>(null)
  const isActiveRef = useRef(isActive)
  const isScrubbingRef = useRef(false)
  const initializedUrlRef = useRef<string | null>(null)
  const durationMsRef = useRef(0)
  const trackWidthRef = useRef(0)
  const trackPageXRef = useRef(0)
  const trackRef = useRef<View | null>(null)
  const pendingSeekMsRef = useRef<number | null>(null)
  const seekLockUntilRef = useRef(0)
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [positionMs, setPositionMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubPositionMs, setScrubPositionMs] = useState<number | null>(null)
  const [trackWidth, setTrackWidth] = useState(0)

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    onScrubStateChangeRef.current = onScrubStateChange
  }, [onScrubStateChange])

  const releasePlayer = useCallback((player: AudioPlayer | null) => {
    if (!player) return
    try { player.pause() } catch {}
    try { player.remove() } catch {}
  }, [])

  const setScrubbing = useCallback((nextValue: boolean) => {
    if (isScrubbingRef.current === nextValue) return
    isScrubbingRef.current = nextValue
    setIsScrubbing(nextValue)
    onScrubStateChangeRef.current?.(nextValue)
  }, [])

  const seekToMs = useCallback(async (nextMs: number) => {
    const player = playerRef.current
    const duration = durationMsRef.current
    if (!player || duration <= 0) return
    const clampedMs = clamp(nextMs, 0, duration)
    pendingSeekMsRef.current = clampedMs
    seekLockUntilRef.current = Date.now() + 1600
    setPositionMs(clampedMs)
    try {
      await player.seekTo(clampedMs / 1000)
    } catch {
      pendingSeekMsRef.current = null
      seekLockUntilRef.current = 0
    }
  }, [])

  const resolvePositionFromGlobalX = useCallback((globalX: number) => {
    const width = trackWidthRef.current
    const duration = durationMsRef.current
    if (width <= 0 || duration <= 0) return 0
    const localX = globalX - trackPageXRef.current
    const ratio = clamp(localX / width, 0, 1)
    return ratio * duration
  }, [])

  const commitScrub = useCallback((globalX: number) => {
    const duration = durationMsRef.current
    const width = trackWidthRef.current
    if (duration <= 0 || width <= 0) {
      setScrubbing(false)
      setScrubPositionMs(null)
      return
    }
    const nextMs = resolvePositionFromGlobalX(globalX)
    setPositionMs(nextMs)
    setScrubbing(false)
    setScrubPositionMs(null)
    void seekToMs(nextMs)
  }, [resolvePositionFromGlobalX, seekToMs, setScrubbing])

  const progressPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => durationMsRef.current > 0,
        onStartShouldSetPanResponderCapture: () => durationMsRef.current > 0,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          durationMsRef.current > 0 && Math.abs(gestureState.dx) > 2,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          durationMsRef.current > 0 && Math.abs(gestureState.dx) > 1,
        onShouldBlockNativeResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (_, gestureState) => {
          if (durationMsRef.current <= 0 || trackWidthRef.current <= 0) return
          trackRef.current?.measureInWindow((x) => {
            trackPageXRef.current = x
          })
          setScrubbing(true)
          const nextMs = resolvePositionFromGlobalX(gestureState.x0)
          setScrubPositionMs(nextMs)
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isScrubbingRef.current) return
          const nextMs = resolvePositionFromGlobalX(gestureState.moveX)
          setScrubPositionMs(nextMs)
        },
        onPanResponderRelease: (_, gestureState) => {
          commitScrub(gestureState.moveX || gestureState.x0)
        },
        onPanResponderTerminate: (_, gestureState) => {
          commitScrub(gestureState.moveX || gestureState.x0)
        },
      }),
    [commitScrub, resolvePositionFromGlobalX, setScrubbing],
  )

  useEffect(() => {
    if (loading) return
    if (initializedUrlRef.current === url && playerRef.current) return

    let cancelled = false
    initializedUrlRef.current = url

    const setupPlayer = async () => {
      releasePlayer(playerRef.current)
      playerRef.current = null
      setLoaded(false)
      setPlaying(false)
      setPositionMs(0)
      setDurationMs(0)
      durationMsRef.current = 0
      setScrubPositionMs(null)
      setScrubbing(false)
      pendingSeekMsRef.current = null
      seekLockUntilRef.current = 0
      try {
        await setAudioModeAsync({ playsInSilentMode: true })
      } catch {}
      if (cancelled) return

      const nextPlayer = createAudioPlayer({
        uri: url,
        headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : undefined,
      })
      nextPlayer.loop = true
      nextPlayer.addListener('playbackStatusUpdate', (status) => {
        if (cancelled) return
        const nextPositionMs = Number.isFinite(status.currentTime)
          ? Math.max(0, status.currentTime * 1000)
          : 0
        const nextDurationMs = Number.isFinite(status.duration)
          ? Math.max(0, status.duration * 1000)
          : 0
        setLoaded(status.isLoaded)
        setPlaying(status.playing)
        setDurationMs((previousDurationMs) => {
          const stableDurationMs = nextDurationMs > 0
            ? nextDurationMs
            : previousDurationMs
          durationMsRef.current = stableDurationMs
          return stableDurationMs
        })

        const pendingSeekMs = pendingSeekMsRef.current
        if (pendingSeekMs !== null) {
          const seekDeltaMs = Math.abs(nextPositionMs - pendingSeekMs)
          if (seekDeltaMs <= 220) {
            pendingSeekMsRef.current = null
            seekLockUntilRef.current = 0
          } else if (Date.now() < seekLockUntilRef.current) {
            setPositionMs(pendingSeekMs)
            return
          } else {
            pendingSeekMsRef.current = null
            seekLockUntilRef.current = 0
          }
        }

        if (!isScrubbingRef.current) {
          setPositionMs(nextPositionMs)
        }
      })
      playerRef.current = nextPlayer
      if (isActiveRef.current) {
        nextPlayer.play()
      } else {
        nextPlayer.pause()
      }
    }

    void setupPlayer()

    return () => {
      cancelled = true
      setScrubbing(false)
      pendingSeekMsRef.current = null
      seekLockUntilRef.current = 0
      releasePlayer(playerRef.current)
      playerRef.current = null
      initializedUrlRef.current = null
    }
  }, [loading, releasePlayer, setScrubbing, url])

  useEffect(() => {
    isActiveRef.current = isActive
    const player = playerRef.current
    if (!player) return
    if (isActive) {
      player.play()
    } else {
      player.pause()
    }
  }, [isActive])

  const handleTogglePlayback = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    if (playing) {
      player.pause()
    } else {
      player.play()
    }
  }, [playing])

  const displayedPositionMs =
    isScrubbing && scrubPositionMs !== null ? scrubPositionMs : positionMs
  const progress =
    durationMs > 0 ? clamp(displayedPositionMs / durationMs, 0, 1) : 0
  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  const knobSize = isScrubbing ? 18 : 14
  const knobLeft =
    trackWidth > 0
      ? clamp(progress * trackWidth - knobSize / 2, -knobSize / 2, trackWidth - knobSize / 2)
      : -knobSize / 2

  return (
    <View
      style={{ width, height } as any}
      className="rounded-xl overflow-hidden bg-surface-container-high"
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <SymbolView name="waveform" size={26} tintColor={Colors.primary} />
        </View>

        <View className="items-center">
          <Text
            className="text-[32px] font-extrabold tracking-tighter text-primary"
            style={{ lineHeight: 34 }}
          >
            Groupys
          </Text>
        </View>

        <View className="mt-5 w-full">
          <View
            ref={trackRef}
            className="relative h-9 justify-center"
            onLayout={(event) => {
              const measured = event.nativeEvent.layout.width
              trackWidthRef.current = measured
              trackRef.current?.measureInWindow((x) => {
                trackPageXRef.current = x
              })
              if (measured !== trackWidth) {
                setTrackWidth(measured)
              }
            }}
            {...progressPanResponder.panHandlers}
          >
            <View className="h-[6px] w-full rounded-full bg-on-surface-variant/15" />
            <View
              className="absolute left-0 top-1/2 h-[6px] rounded-full bg-primary"
              style={{ width: `${progress * 100}%`, marginTop: -3 }}
            />
            <View
              className="absolute top-1/2 rounded-full bg-primary"
              style={{
                width: knobSize,
                height: knobSize,
                left: knobLeft,
                marginTop: -knobSize / 2,
              }}
            />
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-[11px] font-medium text-on-surface-variant/60">
              {formatTime(displayedPositionMs)}
            </Text>
            <Text className="text-[11px] font-medium text-on-surface-variant/60">
              {formatTime(durationMs)}
            </Text>
          </View>
        </View>

        {useGlass ? (
          <GlassView isInteractive style={{ marginTop: 20, borderRadius: 999, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={handleTogglePlayback}
              className="h-11 w-11 items-center justify-center"
              activeOpacity={0.8}
            >
              <SymbolView
                name={playing ? 'pause.fill' : 'play.fill'}
                size={19}
                tintColor={Colors.primary}
              />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            onPress={handleTogglePlayback}
            className="mt-5 h-11 w-11 items-center justify-center rounded-full bg-primary"
            activeOpacity={0.8}
          >
            <SymbolView
              name={playing ? 'pause.fill' : 'play.fill'}
              size={19}
              tintColor={Colors.onPrimary}
            />
          </TouchableOpacity>
        )}

        {!loaded ? (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : null}
      </View>
    </View>
  )
}
