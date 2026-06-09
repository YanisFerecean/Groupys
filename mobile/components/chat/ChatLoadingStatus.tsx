import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Text, View } from 'react-native'

import { Colors } from '@/constants/colors'

/** Phrases cycle while the chat loads, so a slow open reads as progress instead of a dead spinner. */
const PHRASES = [
  'Loading your chat',
  'Waiting for the server',
  'Fetching messages',
  'Decrypting messages',
  'Almost there',
]

const VISIBLE_MS = 1600
const FADE_MS = 320

/** Animated, self-cycling status shown in place of a bare spinner during chat load. */
export function ChatLoadingStatus() {
  const [index, setIndex] = useState(0)
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let cancelled = false

    // Fade the current phrase in, hold, fade out, then advance to the next one.
    const fadeIn = Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true })
    const fadeOut = Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true })

    fadeIn.start()
    const timer = setTimeout(() => {
      if (cancelled) return
      fadeOut.start(({ finished }) => {
        if (finished && !cancelled) {
          setIndex(prev => (prev + 1) % PHRASES.length)
        }
      })
    }, VISIBLE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [index, opacity])

  return (
    <View className="items-center justify-center gap-4">
      <ActivityIndicator color={Colors.primary} />
      <Animated.Text style={{ opacity }} className="text-sm font-semibold text-on-surface-variant">
        {PHRASES[index]}
      </Animated.Text>
      {/* Reserve a stable line so the layout doesn't jump as phrases change length. */}
      <Text className="text-xs text-transparent">{' '}</Text>
    </View>
  )
}
