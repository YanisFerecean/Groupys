import { Text, TouchableOpacity, View } from 'react-native'
import type { Message } from '@/models/Chat'

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  showSeen?: boolean
  onRetry?: () => void
}

export function MessageBubble({
  message,
  isMine,
  showSeen = false,
  onRetry,
}: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <View className={`mb-3 ${isMine ? 'items-end' : 'items-start'}`}>
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

      <View className={`mt-1 flex-row items-center gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <Text className="text-[11px] font-medium text-on-surface-variant">{time}</Text>
        {isMine && message.status === 'sending' ? (
          <Text className="text-[11px] font-medium text-on-surface-variant">Sending...</Text>
        ) : null}
        {isMine && message.status === 'failed' ? (
          <>
            <Text className="text-[11px] font-semibold text-primary">Failed</Text>
            {onRetry ? (
              <TouchableOpacity onPress={onRetry}>
                <Text className="text-[11px] font-semibold text-primary underline">Retry</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
        {isMine && showSeen ? (
          <Text className="text-[11px] font-semibold text-on-surface-variant">Seen</Text>
        ) : null}
      </View>
    </View>
  )
}
