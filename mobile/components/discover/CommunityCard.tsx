import { useRef } from 'react'
import { Animated, Pressable, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { Community } from '@/types'

interface CommunityCardProps {
  community: Community
}

function formatMembers(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(count)
}

export default function CommunityCard({ community }: CommunityCardProps) {
  const scale = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start()
  }

  return (
    <Pressable className="flex-1" onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={{
          backgroundColor: community.color,
          height: 120,
          borderRadius: 16,
          overflow: 'hidden',
          justifyContent: 'flex-end',
          transform: [{ scale }],
        }}
      >
        {/* Decorative icon */}
        <View className="absolute -top-2 -right-2 opacity-10">
          <Ionicons name={community.icon as any} size={80} color="#ffffff" />
        </View>

        {/* Dark overlay */}
        <View className="absolute inset-0 rounded-2xl " />

        {/* Info */}
        <View className="p-4 gap-1">
          <Text className="font-extrabold text-xl text-white">{community.name}</Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" />
            <Text className="text-xs font-semibold text-white/70">
              {formatMembers(community.members)} members
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  )
}
