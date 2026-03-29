import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors } from '@/constants/colors'
import { publicProfilePath } from '@/lib/profileRoutes'
import type { UserMatch } from '@/models/Match'

interface MatchListItemProps {
  match: UserMatch
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function MatchListItem({ match }: MatchListItemProps) {
  const router = useRouter()

  const handlePress = () => {
    if (match.conversationId) {
      router.push(`/(home)/(match)/chat/${match.conversationId}`)
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center gap-3 px-5 py-3 active:bg-surface-container"
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
            style={{ width: 52, height: 52, borderRadius: 26 }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{ width: 52, height: 52, borderRadius: 26 }}
            className="bg-surface-container-high items-center justify-center"
          >
            <Ionicons name="person" size={24} color={Colors.onSurfaceVariant} />
          </View>
        )}
      </Pressable>

      <View className="flex-1">
        <Text className="text-base font-semibold text-on-surface">
          {match.otherDisplayName ?? match.otherUsername}
        </Text>
        <Text className="text-sm text-on-surface-variant">
          Matched {timeAgo(match.matchedAt)}
        </Text>
      </View>

      {match.unreadCount > 0 && (
        <View
          className="items-center justify-center rounded-full bg-primary"
          style={{ minWidth: 20, height: 20, paddingHorizontal: 5 }}
        >
          <Text className="text-[11px] font-bold text-on-primary">
            {match.unreadCount > 99 ? '99+' : match.unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
