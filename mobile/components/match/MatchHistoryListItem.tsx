import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors } from '@/constants/colors'
import { publicProfilePath } from '@/lib/profileRoutes'
import { timeAgo } from '@/lib/timeAgo'
import type { UserMatch } from '@/models/Match'

interface MatchHistoryListItemProps {
  match: UserMatch
}

function statusLabel(status: UserMatch['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'Active'
    case 'UNMATCHED':
      return 'Ended'
    case 'USER_A_HIDDEN':
    case 'USER_B_HIDDEN':
      return 'Hidden'
    default:
      return status
  }
}

export function MatchHistoryListItem({ match }: MatchHistoryListItemProps) {
  const router = useRouter()
  const canOpenChat = match.status === 'ACTIVE' && !!match.conversationId

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
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-base font-bold text-on-surface" numberOfLines={1}>
            {match.otherDisplayName ?? match.otherUsername}
          </Text>
          <View className={`rounded-full px-3 py-1 ${match.status === 'ACTIVE' ? 'bg-primary/15' : 'bg-surface-container-high'}`}>
            <Text className={`text-[11px] font-bold uppercase tracking-wide ${match.status === 'ACTIVE' ? 'text-primary' : 'text-on-surface-variant'}`}>
              {statusLabel(match.status)}
            </Text>
          </View>
        </View>

        <Text className="text-sm text-on-surface-variant">
          Matched {timeAgo(match.matchedAt)}
        </Text>
      </View>

      {match.unreadCount > 0 ? (
        <View
          className="items-center justify-center rounded-full bg-primary"
          style={{ minWidth: 22, height: 22, paddingHorizontal: 6 }}
        >
          <Text className="text-[11px] font-bold text-on-primary">
            {match.unreadCount > 99 ? '99+' : match.unreadCount}
          </Text>
        </View>
      ) : canOpenChat ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
      ) : null}
    </Pressable>
  )
}
