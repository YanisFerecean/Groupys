import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { GlassView } from 'expo-glass-effect'
import { Colors } from '@/constants/colors'
import { publicProfilePath } from '@/lib/profileRoutes'
import { timeAgo } from '@/lib/timeAgo'
import type { UserMatch } from '@/models/Match'

interface MatchHistoryListItemProps {
  match: UserMatch
  useGlass?: boolean
}

export function MatchHistoryListItem({ match, useGlass = false }: MatchHistoryListItemProps) {
  const router = useRouter()
  const canOpenChat = match.status === 'ACTIVE' && !!match.conversationId

  const rowContent = (
    <>
      <Pressable
        onPress={(event) => {
          event.stopPropagation()
          router.push(publicProfilePath(match.otherUserId, '(match)') as never)
        }}
      >
        {match.otherProfileImage ? (
          <Image
            source={{ uri: match.otherProfileImage }}
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
      </Pressable>

      <View className="flex-1 gap-1">
        <Text className="text-base font-bold text-on-surface" numberOfLines={1}>
          {match.otherDisplayName ?? match.otherUsername}
        </Text>

        <Text className="text-sm text-on-surface-variant">
          Matched {timeAgo(match.matchedAt)}
        </Text>
      </View>

      {useGlass ? (
        <GlassView style={{ borderRadius: 999, overflow: 'hidden' }}>
          <View className="h-8 w-8 items-center justify-center rounded-full">
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </View>
        </GlassView>
      ) : (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-container-high">
          <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
        </View>
      )}
    </>
  )

  if (useGlass) {
    return (
      <View className="mx-5 mb-3">
        <GlassView style={{ borderRadius: 24, overflow: 'hidden' }} isInteractive>
          <Pressable
            onPress={() => {
              if (canOpenChat) {
                router.push(`/(home)/(match)/chat/${match.conversationId}` as never)
              }
            }}
            disabled={!canOpenChat}
            className="flex-row items-center gap-4 px-4 py-4"
          >
            {rowContent}
          </Pressable>
        </GlassView>
      </View>
    )
  }

  return (
    <Pressable
      onPress={() => {
        if (canOpenChat) {
          router.push(`/(home)/(match)/chat/${match.conversationId}` as never)
        }
      }}
      disabled={!canOpenChat}
      className="mx-5 mb-3 flex-row items-center gap-4 rounded-3xl bg-surface-container px-4 py-4"
    >
      {rowContent}
    </Pressable>
  )
}
