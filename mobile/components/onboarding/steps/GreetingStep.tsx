import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors } from '@/constants/colors'

interface GreetingStepProps {
  name: string
  onDone: () => void
}

export default function GreetingStep({ name, onDone }: GreetingStepProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600)
    return () => clearTimeout(t)
  }, [onDone])

  const first = name.trim().split(/\s+/)[0] || 'there'

  return (
    <Pressable onPress={onDone} className="flex-1">
      <View className="flex-1 bg-surface">
        <LinearGradient
          colors={[Colors.primaryContainer, Colors.secondaryContainer, Colors.surface]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0"
        />
        <View className="flex-1 items-center justify-center px-8">
          <Animated.Text entering={FadeIn.duration(400)} className="text-6xl">
            👋
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(150).duration(500)}
            className="mt-6 text-center text-4xl font-black tracking-tighter text-on-surface"
          >
            Nice to meet you,{'\n'}
            {first}.
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(350).duration(500)}
            className="mt-4 text-center text-xl text-on-surface-variant"
          >
            Let&apos;s build your music identity.
          </Animated.Text>
        </View>
      </View>
    </Pressable>
  )
}
