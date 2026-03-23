import { useRef } from 'react'
import { Animated, Pressable, View, Text } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { Community } from '@/types'

interface CommunityCardProps {
  community: Community
  onPress?: () => void
}

function formatMembers(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(count)
}

export default function CommunityCard({ community, onPress }: CommunityCardProps) {
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

  const hasBanner = !!community.bannerUrl
  const hasIconImage = community.iconType === 'IMAGE' && !!community.iconUrl
  const hasIconEmoji = community.iconType === 'EMOJI' && !!community.iconEmoji

  return (
    <Pressable
      className="flex-1"
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View
        style={{
          backgroundColor: hasBanner ? '#000' : community.color,
          height: 120,
          borderRadius: 16,
          overflow: 'hidden',
          justifyContent: 'flex-end',
          transform: [{ scale }],
        }}
      >
        {/* Real banner image */}
        {hasBanner ? (
          <Image
            source={{ uri: community.bannerUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
          />
        ) : null}

        {/* Decorative icon (fallback when no banner) */}
        {!hasBanner ? (
          <View className="absolute -top-2 -right-2 opacity-10">
            <Ionicons name={community.icon as any} size={80} color="#ffffff" />
          </View>
        ) : null}

        {/* Dark gradient overlay */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 70,
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        />

        {/* Info */}
        <View className="p-4 gap-1">
          <View className="flex-row items-center gap-2 mb-0.5">
            {/* Icon */}
            {hasIconImage ? (
              <Image
                source={{ uri: community.iconUrl }}
                style={{ width: 20, height: 20, borderRadius: 4 }}
                contentFit="cover"
              />
            ) : hasIconEmoji ? (
              <Text style={{ fontSize: 16 }}>{community.iconEmoji}</Text>
            ) : null}
            <Text className="font-extrabold text-xl text-white flex-1" numberOfLines={1}>
              {community.name}
            </Text>
          </View>
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
