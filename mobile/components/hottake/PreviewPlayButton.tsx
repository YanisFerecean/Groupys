import { useCallback, useEffect, useRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { SymbolView } from 'expo-symbols'

// Only one preview may play across the whole app at a time.
let activeStop: (() => void) | null = null

interface PreviewPlayButtonProps {
  url: string
  size?: number
}

export default function PreviewPlayButton({ url, size = 28 }: PreviewPlayButtonProps) {
  const playerRef = useRef<AudioPlayer | null>(null)
  const [playing, setPlaying] = useState(false)

  const teardown = useCallback(() => {
    const player = playerRef.current
    playerRef.current = null
    if (activeStop === teardownRefHolder.current) activeStop = null
    if (!player) return
    try { player.pause() } catch {}
    try { player.remove() } catch {}
    setPlaying(false)
  }, [])

  // stable handle so the module-level activeStop can be compared/cleared
  const teardownRefHolder = useRef<(() => void) | null>(null)
  useEffect(() => {
    teardownRefHolder.current = teardown
  }, [teardown])

  useEffect(() => () => teardown(), [teardown])

  const toggle = useCallback(async () => {
    if (playerRef.current) {
      teardown()
      return
    }
    if (activeStop) activeStop()
    try {
      await setAudioModeAsync({ playsInSilentMode: true })
    } catch {}
    const player = createAudioPlayer({ uri: url })
    player.addListener('playbackStatusUpdate', (status) => {
      setPlaying(status.playing)
      if (status.didJustFinish) teardown()
    })
    playerRef.current = player
    activeStop = teardownRefHolder.current
    player.play()
    setPlaying(true)
  }, [teardown, url])

  return (
    <View className="absolute inset-0 items-center justify-center">
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.85}
        style={{ width: size, height: size }}
        className="items-center justify-center rounded-full bg-black/55"
      >
        <SymbolView name={playing ? 'pause.fill' : 'play.fill'} size={size * 0.5} tintColor="#fff" />
      </TouchableOpacity>
    </View>
  )
}
