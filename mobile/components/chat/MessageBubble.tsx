import { Ionicons } from '@expo/vector-icons'
import { Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '@/constants/colors'
import type { Message } from '@/models/Chat'

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  showSeen?: boolean
  /** Show the timestamp/receipt row. False for messages grouped under a later one. */
  showTime?: boolean
  onRetry?: () => void
}

export function MessageBubble({
  message,
  isMine,
  showSeen = false,
  showTime = true,
  onRetry,
}: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  const isSending = message.status === 'sending'
  const isFailed = message.status === 'failed'
  // A message of mine that isn't pending/failed has been delivered to the server.
  const isDelivered = isMine && !isSending && !isFailed
  const hasPendingStatus = isMine && (isSending || isFailed)
  // Render the footer when this message ends a same-minute group, has a pending/failed
  // status, or is the last one the other user has read.
  const showFooter = showTime || hasPendingStatus || (isMine && showSeen)

  return (
    <View className={`${showTime ? 'mb-3' : 'mb-0.5'} ${isMine ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[82%] rounded-[24px] px-4 py-3 ${
          isMine
            ? 'rounded-br-md bg-primary'
            : 'rounded-bl-md bg-surface-container'
        } ${message.status === 'sending' ? 'opacity-70' : ''}`}
      >
        <Text className={`text-[15px] leading-6 ${isMine ? 'text-on-primary' : 'text-on-surface'}`}>
          {message.content}
        </Text>
      </View>

      {showFooter ? (
      <View className={`mt-1 flex-row items-center gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {showTime ? (
          <Text className="text-[11px] font-medium text-on-surface-variant">{time}</Text>
        ) : null}
        {isSending && isMine ? (
          <Text className="text-[11px] font-medium text-on-surface-variant">Sending...</Text>
        ) : isFailed && isMine ? (
          <>
            <Text className="text-[11px] font-semibold text-primary">Failed</Text>
            {onRetry ? (
              <TouchableOpacity onPress={onRetry}>
                <Text className="text-[11px] font-semibold text-primary underline">Retry</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : isDelivered ? (
          // Delivered/seen receipt: double check + "Seen" once the other user has read it.
          <View className="flex-row items-center gap-1">
            <Ionicons
              name={showSeen ? 'checkmark-done' : 'checkmark'}
              size={13}
              color={showSeen ? Colors.primary : Colors.onSurfaceVariant}
            />
            {showSeen ? (
              <Text className="text-[11px] font-semibold text-primary">Seen</Text>
            ) : null}
          </View>
        ) : null}
      </View>
      ) : null}
    </View>
  )
}
