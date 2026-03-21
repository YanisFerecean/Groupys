import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import type { CuratorProfile } from '@/types'

interface CuratorListItemProps {
  curator: CuratorProfile
}

export default function CuratorListItem({ curator }: CuratorListItemProps) {
  return (
    <View className="flex-row items-center py-2">
      {/* Avatar with badge */}
      <View className="relative">
        <Image
          source={curator.image}
          className="w-12 h-12 rounded-full"
          contentFit="cover"
        />
        <View className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full bg-primary items-center justify-center border border-surface">
          <Ionicons name="star" size={10} color="#fff" />
        </View>
      </View>

      {/* Info + accent line */}
      <View className="flex-1 ml-3">
        <Text className="text-base font-bold text-on-surface">{curator.name}</Text>
        <Text className="text-base text-on-surface-variant">
          Top Pick: {curator.topPick}
        </Text>
        <View className="mt-1.5 h-px w-full bg-primary opacity-40" />
      </View>

      {/* Follow button */}
      <Pressable className="ml-3 w-8 h-8 rounded-full bg-primary items-center justify-center">
        <Text className="text-white text-lg font-bold leading-none">+</Text>
      </Pressable>
    </View>
  )
}
