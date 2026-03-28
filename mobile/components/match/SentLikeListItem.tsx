import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { timeAgo } from '@/lib/timeAgo'
import type { SentLike } from '@/models/Match'

interface SentLikeListItemProps {
  like: SentLike
  busy: boolean
  onWithdraw: () => void
}

export function SentLikeListItem({ like, busy, onWithdraw }: SentLikeListItemProps) {
  return (
    <View className="mx-5 mb-3 flex-row items-center gap-4 rounded-3xl bg-surface-container px-4 py-4">
      {like.targetProfileImage ? (
        <Image
          source={{ uri: like.targetProfileImage }}
          style={{ width: 56, height: 56, borderRadius: 28 }}
          contentFit="cover"
        />
      ) : (
        <View
          className="items-center justify-center rounded-full bg-surface-container-high"
          style={{ width: 56, height: 56 }}
        >
          <Ionicons name="person" size={24} color={Colors.onSurfaceVariant} />
        </View>
      )}

      <View className="flex-1 gap-1">
        <Text className="text-base font-bold text-on-surface" numberOfLines={1}>
          {like.targetDisplayName ?? like.targetUsername}
        </Text>
        <Text className="text-sm text-on-surface-variant">
          Liked {timeAgo(like.likedAt)}
        </Text>
      </View>

      <Pressable
        onPress={onWithdraw}
        disabled={busy}
        className={`rounded-full px-4 py-2 ${busy ? 'bg-surface-container-high' : 'bg-primary/15'}`}
      >
        <Text className={`text-xs font-bold uppercase tracking-wide ${busy ? 'text-on-surface-variant' : 'text-primary'}`}>
          {busy ? 'Removing' : 'Remove'}
        </Text>
      </Pressable>
    </View>
  )
}
