import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '@/constants/colors'
import type { Message } from '@/models/Chat'
import { getMessageRenderer, isTextType } from '@/components/chat/messageRenderers'

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  showSeen?: boolean
  /** Show the timestamp/receipt row. False for messages grouped under a later one. */
  showTime?: boolean
  onRetry?: () => void
  /** Long-press the bubble → open the action menu (ticket 3.1+). */
  onLongPress?: () => void
  /** Tap the quoted reply preview → scroll to the original (ticket 3.1). */
  onQuotePress?: (messageId: string) => void
}

export function MessageBubble({
  message,
  isMine,
  showSeen = false,
  showTime = true,
  onRetry,
  onLongPress,
  onQuotePress,
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

  // Delegate structured message types to the renderer registry (ticket 0.3). TEXT/SYSTEM keep
  // the text bubble; a known card type renders its card; unknown types get a graceful fallback.
  const isText = isTextType(message.messageType)
  const CardRenderer = isText ? undefined : getMessageRenderer(message.messageType)
  const isUnsupported = !isText && !CardRenderer

  return (
    <View
      className={`${showTime ? 'mb-3' : 'mb-0.5'} ${isMine ? 'items-end' : 'items-start'}`}
      style={message.status === 'sending' ? { opacity: 0.7 } : undefined}
    >
      {message.replyTo ? (
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!onQuotePress}
          onPress={() => onQuotePress?.(message.replyTo!.id)}
          className={`mb-1 max-w-[82%] rounded-xl border-l-2 px-2.5 py-1.5 ${isMine ? 'items-end' : 'items-start'}`}
          style={{ borderLeftColor: Colors.primary, backgroundColor: Colors.surfaceContainerHigh }}
        >
          <Text className="text-[11px] font-bold text-primary" numberOfLines={1}>
            {message.replyTo.senderDisplayName || message.replyTo.senderUsername}
          </Text>
          <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>
            {message.replyTo.snippet}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Pressable onLongPress={onLongPress} delayLongPress={300}>
      {CardRenderer ? (
        <CardRenderer message={message} isMine={isMine} />
      ) : isUnsupported ? (
        <View
          className={`max-w-[82%] rounded-[24px] px-4 py-3 ${
            isMine ? 'rounded-br-md bg-primary' : 'rounded-bl-md bg-surface-container'
          }`}
        >
          <Text className={`text-[13px] italic ${isMine ? 'text-on-primary' : 'text-on-surface-variant'}`}>
            Unsupported message — update the app to view it.
          </Text>
        </View>
      ) : (
        <View
          className={`max-w-[82%] rounded-[24px] px-4 py-3 ${
            isMine
              ? 'rounded-br-md bg-primary'
              : 'rounded-bl-md bg-surface-container'
          }`}
        >
          <Text className={`text-[15px] leading-6 ${isMine ? 'text-on-primary' : 'text-on-surface'}`}>
            {message.content}
          </Text>
        </View>
      )}
      </Pressable>

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
