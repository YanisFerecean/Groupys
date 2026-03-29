import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '@/constants/colors'
import type { Conversation } from '@/models/Chat'

interface ChatRequestListItemProps {
  conversation: Conversation
  currentUsername?: string | null
  busyAction?: 'accept' | 'deny' | null
  onAccept?: () => void
  onDeny?: () => void
  onPress: () => void
  onProfilePress?: () => void
}

export function ChatRequestListItem({
  conversation,
  currentUsername,
  busyAction = null,
  onAccept,
  onDeny,
  onPress,
  onProfilePress,
}: ChatRequestListItemProps) {
  const otherParticipant = conversation.participants.find(participant => participant.username !== currentUsername)
  const displayName = otherParticipant?.displayName || otherParticipant?.username || 'Unknown user'
  const avatarUrl = otherParticipant?.profileImage
  const initial = displayName.charAt(0).toUpperCase()
  const isIncoming = conversation.requestStatus === 'PENDING_INCOMING'
  const description = isIncoming
    ? 'Wants to start a chat with you.'
    : 'Request sent. Waiting for them to respond.'

  return (
    <View className="mx-5 mb-3 rounded-3xl bg-surface-container p-4">
      <TouchableOpacity className="flex-row items-center gap-3" onPress={onPress} activeOpacity={0.9}>
        <TouchableOpacity
          onPress={(event) => {
            event.stopPropagation()
            ;(onProfilePress ?? onPress)()
          }}
          activeOpacity={0.8}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 52, height: 52, borderRadius: 26 }}
              contentFit="cover"
            />
          ) : (
            <View
              className="items-center justify-center rounded-full bg-primary/10"
              style={{ width: 52, height: 52 }}
            >
              <Text className="text-lg font-bold text-primary">{initial}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-base font-bold text-on-surface" numberOfLines={1}>
              {displayName}
            </Text>
            <View className="rounded-full bg-primary/10 px-3 py-1">
              <Text className="text-[11px] font-bold uppercase tracking-wide text-primary">
                {isIncoming ? 'Request' : 'Pending'}
              </Text>
            </View>
          </View>
          <Text className="mt-1 text-sm font-medium text-on-surface-variant" numberOfLines={2}>
            {description}
          </Text>
        </View>
      </TouchableOpacity>

      {isIncoming ? (
        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 items-center justify-center rounded-2xl bg-surface px-4 py-3"
            disabled={busyAction !== null}
            onPress={onDeny}
          >
            {busyAction === 'deny' ? (
              <ActivityIndicator color={Colors.onSurface} />
            ) : (
              <Text className="text-sm font-bold text-on-surface">Deny</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 items-center justify-center rounded-2xl bg-primary px-4 py-3"
            disabled={busyAction !== null}
            onPress={onAccept}
          >
            {busyAction === 'accept' ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text className="text-sm font-bold text-on-primary">Accept</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          className="mt-4 flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3"
          onPress={onPress}
          activeOpacity={0.85}
        >
          <Text className="text-sm font-semibold text-on-surface-variant">
            Open request
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      )}
    </View>
  )
}
