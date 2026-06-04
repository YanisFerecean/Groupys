import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors } from '@/constants/colors'

const MESSAGES = [
  'Reading your library…',
  'Finding your top artists…',
  'Picking your favorite albums…',
  'Composing your music identity…',
]

export default function BuildingStep() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length)
    }, 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <View className="flex-1 bg-surface">
      <LinearGradient
        colors={[Colors.primaryContainer, Colors.secondaryContainer, Colors.surface]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <View className="flex-1 items-center justify-center px-10">
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="mt-8 text-center text-3xl font-black tracking-tighter text-on-surface">
          Building your profile
        </Text>
        <Animated.Text
          key={index}
          entering={FadeIn.duration(400)}
          className="mt-3 text-center text-xl text-on-surface-variant"
        >
          {MESSAGES[index]}
        </Animated.Text>
      </View>
    </View>
  )
}
