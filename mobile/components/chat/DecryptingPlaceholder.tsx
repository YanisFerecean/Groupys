import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

/**
 * Pulsing skeleton bars shown inside a message bubble while its E2E content is still ciphertext.
 * Prevents the raw `{"v":1,…}` envelope from flashing before decryption completes (e.g. on a cold
 * open from a push notification, before the crypto keys are ready).
 */
export function DecryptingPlaceholder({ isMine }: { isMine: boolean }) {
  const pulse = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  const barColor = isMine ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.18)'

  return (
    <Animated.View style={{ opacity: pulse, gap: 6 }}>
      <Animated.View style={{ width: 140, height: 10, borderRadius: 5, backgroundColor: barColor }} />
      <Animated.View style={{ width: 90, height: 10, borderRadius: 5, backgroundColor: barColor }} />
    </Animated.View>
  )
}
