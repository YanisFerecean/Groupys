import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { GlassView } from 'expo-glass-effect'
import { Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '@/constants/colors'
import { timeAgo } from '@/lib/timeAgo'
import type { Conversation } from '@/models/Chat'

interface ConversationListItemProps {
  conversation: Conversation
  currentUsername?: string | null
  preview?: string
  onPress: () => void
  onProfilePress?: () => void
  useGlass?: boolean
}

export function ConversationListItem({
  conversation,
  currentUsername,
  preview,
  onPress,
  onProfilePress,
  useGlass = false,
}: ConversationListItemProps) {
  const otherParticipant = conversation.participants.find(participant => participant.username !== currentUsername)
  const displayName = conversation.isGroup
    ? (conversation.groupName ?? 'Group Chat')
    : (otherParticipant?.displayName || otherParticipant?.username || 'Unknown user')

  const avatarUrl = conversation.isGroup ? null : otherParticipant?.profileImage
  const initial = displayName.charAt(0).toUpperCase()

  const rowContent = (
    <>
      <TouchableOpacity
        className="relative"
        onPress={(event) => {
          event.stopPropagation()
          ;(onProfilePress ?? onPress)()
        }}
        activeOpacity={0.8}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 56, height: 56, borderRadius: 28 }}
            contentFit="cover"
          />
        ) : useGlass ? (
          <GlassView style={{ borderRadius: 999, overflow: 'hidden' }}>
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 56, height: 56 }}
            >
              <Text className="text-lg font-bold text-primary">{initial}</Text>
            </View>
          </GlassView>
        ) : (
          <View
            className="items-center justify-center rounded-full bg-primary/10"
            style={{ width: 56, height: 56 }}
          >
            <Text className="text-lg font-bold text-primary">{initial}</Text>
          </View>
        )}
        {conversation.unreadCount > 0 ? (
          <View
            className="absolute -right-1 -top-1 items-center justify-center rounded-full bg-primary"
            style={{ minWidth: 20, height: 20, paddingHorizontal: 5 }}
          >
            <Text className="text-[11px] font-bold text-on-primary">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 pr-3 text-base font-bold text-on-surface" numberOfLines={1}>
            {displayName}
          </Text>
          {conversation.lastMessageAt ? (
            <Text className="text-xs font-medium text-on-surface-variant">
              {timeAgo(conversation.lastMessageAt)}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-2">
          <Text
            className={`flex-1 text-sm ${conversation.unreadCount > 0 ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}
            numberOfLines={1}
          >
            {preview ?? conversation.lastMessage ?? 'Start a conversation...'}
          </Text>
          {useGlass ? (
            <GlassView style={{ borderRadius: 999, overflow: 'hidden' }} isInteractive>
              <View className="h-8 w-8 items-center justify-center rounded-full">
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </View>
            </GlassView>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
          )}
        </View>
      </View>
    </>
  )

  if (useGlass) {
    return (
      <View className="mx-5 mb-3">
        <GlassView style={{ borderRadius: 24, overflow: 'hidden' }} isInteractive>
          <TouchableOpacity
            className="flex-row items-center gap-4 px-4 py-4"
            onPress={onPress}
            activeOpacity={0.85}
          >
            {rowContent}
          </TouchableOpacity>
        </GlassView>
      </View>
    )
  }

  return (
    <TouchableOpacity
      className="flex-row items-center gap-4 px-5 py-4"
      onPress={onPress}
      activeOpacity={0.85}
    >
      {rowContent}
    </TouchableOpacity>
  )
}
