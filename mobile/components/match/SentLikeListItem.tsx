import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { GlassView } from 'expo-glass-effect'
import { Colors } from '@/constants/colors'
import { timeAgo } from '@/lib/timeAgo'
import type { SentLike } from '@/models/Match'

interface SentLikeListItemProps {
  like: SentLike
  busy: boolean
  onWithdraw: () => void
  useGlass?: boolean
}

export function SentLikeListItem({ like, busy, onWithdraw, useGlass = false }: SentLikeListItemProps) {
  const rowContent = (
    <>
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

      {useGlass ? (
        <GlassView style={{ borderRadius: 999, overflow: 'hidden' }} isInteractive>
          <Pressable
            onPress={onWithdraw}
            disabled={busy}
            className="h-10 w-10 items-center justify-center rounded-full"
          >
            <Ionicons
              name="close"
              size={20}
              color={busy ? Colors.onSurfaceVariant : Colors.primary}
            />
          </Pressable>
        </GlassView>
      ) : (
        <Pressable
          onPress={onWithdraw}
          disabled={busy}
          className={`h-10 w-10 items-center justify-center rounded-full ${busy ? 'bg-surface-container-high' : 'bg-primary/15'}`}
        >
          <Ionicons
            name="close"
            size={20}
            color={busy ? Colors.onSurfaceVariant : Colors.primary}
          />
        </Pressable>
      )}
    </>
  )

  if (useGlass) {
    return (
      <View className="mx-5 mb-3">
        <GlassView style={{ borderRadius: 24, overflow: 'hidden' }} isInteractive>
          <View className="flex-row items-center gap-4 px-4 py-4">
            {rowContent}
          </View>
        </GlassView>
      </View>
    )
  }

  return (
    <View className="mx-5 mb-3 flex-row items-center gap-4 rounded-3xl bg-surface-container px-4 py-4">
      {rowContent}
    </View>
  )
}
