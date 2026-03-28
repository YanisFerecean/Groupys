import { View, Text, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import type { SuggestedCommunity } from '@/models/SuggestedCommunity'

interface Props {
  community: SuggestedCommunity
  onJoin: () => void
  onDismiss: () => void
  onPress: () => void
}

export default function CommunityRecommendationCard({ community, onJoin, onDismiss, onPress }: Props) {
  const handleJoin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onJoin()
  }

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onDismiss()
  }

  return (
    <Animated.View 
      entering={FadeIn} 
      exiting={FadeOut}
      className="mb-4 rounded-[28px] bg-surface-container overflow-hidden"
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <Image 
          source={{ uri: community.bannerUrl || community.imageUrl || undefined }} 
          className="w-full h-36 bg-surface-variant"
          contentFit="cover"
        />
        <View className="p-5">
          <View className="flex-row items-center justify-between mb-2 gap-2">
            <Text className="text-xl font-extrabold text-on-surface flex-1" numberOfLines={1}>
              {community.name}
            </Text>
            {community.iconEmoji && (
              <Text className="text-2xl">{community.iconEmoji}</Text>
            )}
          </View>
          
          <Text className="text-[15px] text-primary font-semibold mb-3">
            {community.explanation || "Suggested based on your taste"}
          </Text>
          
          <View className="flex-row flex-wrap gap-2 mb-4">
            {community.matchedArtists?.slice(0, 3).map(artist => (
              <View key={artist.id} className="bg-primary/10 px-3 py-1.5 rounded-full">
                <Text className="text-xs text-primary font-bold">{artist.name}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row items-center justify-between mt-1 gap-3">
            <TouchableOpacity 
              className="px-4 bg-surface-variant py-3 rounded-full items-center justify-center flex-row gap-1"
              onPress={handleDismiss}
            >
              <Text className="text-on-surface-variant font-bold text-sm">Hide</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 bg-primary py-3 rounded-full items-center justify-center"
              onPress={handleJoin}
            >
              <Text className="text-on-primary font-bold text-sm">Join</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}
