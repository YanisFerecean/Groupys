import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

function FloatingNote({
  x,
  y,
  delay,
  color,
  size = 1,
}: {
  x: number
  y: number
  delay: number
  color: string
  size?: number
}) {
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(0)
  const rotate = useSharedValue(0)

  useEffect(() => {
    // Full arc: float up smoothly, then back down — no instant snap
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-38, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    )
    // Fade in on the way up, fade out on the way down
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 700, easing: Easing.out(Easing.quad) }),
          withTiming(0.9, { duration: 1300 }),
          withTiming(0, { duration: 1000, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 1000 }),
        ),
        -1,
      ),
    )
    // Gentle pendulum sway — reverse repeat for seamless oscillation
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(18, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}>
      <Svg width={20 * size} height={24 * size} viewBox="0 0 20 24">
        <Path
          d="M7 4v14a4 4 0 1 1-2-3.46V2l12-2v14a4 4 0 1 1-2-3.46V4L7 5.33"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  )
}

function PulsingCircle({
  cx,
  cy,
  r,
  color,
  delay,
}: {
  cx: number
  cy: number
  r: number
  color: string
  delay: number
}) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(0.18)

  useEffect(() => {
    // Scale expands smoothly; reset happens while opacity is 0 so it's invisible
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.7, { duration: 2200, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
      ),
    )
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 2200, easing: Easing.in(Easing.quad) }),
          withTiming(0.18, { duration: 0 }),
        ),
        -1,
      ),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: color,
        },
        style,
      ]}
    />
  )
}

function Person({
  x,
  headColor,
  bodyColor,
  delay,
  flip,
}: {
  x: number
  headColor: string
  bodyColor: string
  delay: number
  flip?: boolean
}) {
  const bounce = useSharedValue(0)
  const sway = useSharedValue(0)

  useEffect(() => {
    // withRepeat + reverse gives a perfectly smooth oscillation with no direction seam
    bounce.value = withDelay(
      delay,
      withRepeat(
        withTiming(-7, { duration: 550, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    )
    sway.value = withDelay(
      delay,
      withRepeat(
        withTiming(5, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { rotate: `${sway.value}deg` },
    ],
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          bottom: 10,
          alignItems: 'center',
          transform: flip ? [{ scaleX: -1 }] : [],
        },
        style,
      ]}
    >
      <Svg width={52} height={90} viewBox="0 0 52 90">
        <Circle cx={26} cy={14} r={14} fill={headColor} />
        <Path
          d="M26 28 C14 32, 8 48, 10 66 Q12 78, 18 86 L26 82 L34 86 Q40 78, 42 66 C44 48, 38 32, 26 28Z"
          fill={bodyColor}
        />
        <Path
          d="M10 44 Q2 38, 0 48 Q2 56, 8 58"
          fill={bodyColor}
          stroke={bodyColor}
          strokeWidth={1}
          strokeLinecap="round"
        />
        <Path
          d="M42 44 Q50 38, 52 48 Q50 56, 44 58"
          fill={bodyColor}
          stroke={bodyColor}
          strokeWidth={1}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  )
}

function Headphones({ x, delay }: { x: number; delay: number }) {
  const bounce = useSharedValue(0)

  useEffect(() => {
    bounce.value = withDelay(
      delay,
      withRepeat(
        withTiming(-7, { duration: 550, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }))

  return (
    <Animated.View style={[{ position: 'absolute', left: x, bottom: 78 }, style]}>
      <Svg width={36} height={20} viewBox="0 0 36 20">
        <Path
          d="M4 16 Q4 2, 18 2 Q32 2, 32 16"
          fill="none"
          stroke="#1a1c1d"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Rect x={0} y={12} width={8} height={8} rx={3} fill="#1a1c1d" />
        <Rect x={28} y={12} width={8} height={8} rx={3} fill="#1a1c1d" />
      </Svg>
    </Animated.View>
  )
}

export default function MusicPeopleGraphic() {
  return (
    <View style={{ width: 280, height: 260 }}>
        {/* Sound wave pulses */}
        <PulsingCircle cx={140} cy={180} r={50} color="#ba002b" delay={100} />
        <PulsingCircle cx={140} cy={180} r={70} color="#ba002b" delay={1000} />
        <PulsingCircle cx={140} cy={180} r={90} color="#ba002b" delay={2000} />

        {/* Floating musical notes — y positions must be > 38 (float distance) to avoid top clipping */}
        <FloatingNote x={30} y={80} delay={0} color="#ba002b" size={1} />
        <FloatingNote x={210} y={60} delay={800} color="#ab323b" size={0.85} />
        <FloatingNote x={120} y={55} delay={1600} color="#ba002b" size={1.1} />
        <FloatingNote x={240} y={90} delay={400} color="#916e6e" size={0.7} />
        <FloatingNote x={60} y={60} delay={2000} color="#ab323b" size={0.8} />

        {/* People dancing */}
        <Person x={40} headColor="#e5183b" bodyColor="#ba002b" delay={0} />
        <Person x={114} headColor="#ff7075" bodyColor="#ab323b" delay={200} />
        <Person x={188} headColor="#e5183b" bodyColor="#ba002b" delay={400} flip />

        {/* Headphones on center person */}
        <Headphones x={122} delay={200} />
    </View>
  )
}
