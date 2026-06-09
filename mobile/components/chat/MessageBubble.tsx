import { Ionicons } from '@expo/vector-icons'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Pressable, Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '@/constants/colors'
import type { Message } from '@/models/Chat'
import { getMessageRenderer, isTextType } from '@/components/chat/messageRenderers'
import { TrackReactionChip } from '@/components/chat/TrackReactionChip'
import { DecryptingPlaceholder } from '@/components/chat/DecryptingPlaceholder'
import { isEncrypted } from '@/lib/chat-crypto'

const GLASS = isLiquidGlassAvailable()

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
  /** Current user id, to highlight own reactions (ticket 3.2). */
  myUserId?: string
  /** Tap a reaction chip → toggle (ticket 3.2). */
  onToggleReaction?: (messageId: string, emoji: string) => void
  /** Briefly emphasize a message jumped to from search (ticket 3.5). */
  highlighted?: boolean
}

export function MessageBubble({
  message,
  isMine,
  showSeen = false,
  showTime = true,
  onRetry,
  onLongPress,
  onQuotePress,
  myUserId,
  onToggleReaction,
  highlighted = false,
}: MessageBubbleProps) {
  // Aggregate reactions into {emoji, count, mine} chips (ticket 3.2).
  const reactionChips = (() => {
    const map = new Map<string, { count: number; mine: boolean }>()
    for (const r of message.reactions ?? []) {
      if ((r.type ?? 'emoji') !== 'emoji' || !r.emoji) continue
      const entry = map.get(r.emoji) ?? { count: 0, mine: false }
      entry.count += 1
      if (r.userId === myUserId) entry.mine = true
      map.set(r.emoji, entry)
    }
    return Array.from(map.entries()).map(([emoji, v]) => ({ emoji, ...v }))
  })()
  const trackReactionChips = (() => {
    const map = new Map<string, { track: NonNullable<NonNullable<Message['reactions']>[number]['track']>; count: number; mine: boolean }>()
    for (const reaction of message.reactions ?? []) {
      if (reaction.type !== 'track' || !reaction.track) continue
      const key = reaction.track.id
      const entry = map.get(key) ?? { track: reaction.track, count: 0, mine: false }
      entry.count += 1
      if (reaction.userId === myUserId) entry.mine = true
      map.set(key, entry)
    }
    return Array.from(map.values())
  })()
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
  // Deleted messages always show a tombstone (ticket 3.3).
  const isText = isTextType(message.messageType) || message.isDeleted
  const CardRenderer = (isText || message.isDeleted) ? undefined : getMessageRenderer(message.messageType)
  const isUnsupported = !isText && !CardRenderer

  // Sent bubble: vibrant primary-tinted glass. Received: frosted neutral glass.
  const sentTint = 'rgba(186, 0, 43, 0.92)'
  const receivedTint = 'rgba(255, 255, 255, 0.18)'

  const renderBubble = () => {
    if (CardRenderer) {
      return <CardRenderer message={message} isMine={isMine} />
    }
    if (isUnsupported) {
      if (GLASS) {
        return (
          <GlassView
            tintColor={isMine ? sentTint : receivedTint}
            style={{ maxWidth: 290, borderRadius: 24, borderBottomRightRadius: isMine ? 6 : 24, borderBottomLeftRadius: isMine ? 24 : 6, paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text className={`text-[13px] italic ${isMine ? 'text-on-primary' : 'text-on-surface-variant'}`}>
              Unsupported message — update the app to view it.
            </Text>
          </GlassView>
        )
      }
      return (
        <View
          className={`max-w-[82%] rounded-[24px] px-4 py-3 ${
            isMine ? 'rounded-br-md bg-primary' : 'rounded-bl-md bg-surface-container'
          }`}
        >
          <Text className={`text-[13px] italic ${isMine ? 'text-on-primary' : 'text-on-surface-variant'}`}>
            Unsupported message — update the app to view it.
          </Text>
        </View>
      )
    }
    // Normal text bubble
    if (GLASS) {
      return (
        <GlassView
          tintColor={isMine ? sentTint : receivedTint}
          style={{ maxWidth: 290, borderRadius: 24, borderBottomRightRadius: isMine ? 6 : 24, borderBottomLeftRadius: isMine ? 24 : 6, paddingHorizontal: 16, paddingVertical: 12 }}
        >
          {message.isDeleted ? (
            <Text className={`text-[14px] italic ${isMine ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>
              This message was deleted
            </Text>
          ) : isEncrypted(message.content) ? (
            <DecryptingPlaceholder isMine={isMine} />
          ) : (
            <Text className={`text-[15px] leading-6 ${isMine ? 'text-white' : 'text-on-surface'}`}>
              {message.content}
            </Text>
          )}
        </GlassView>
      )
    }
    return (
      <View
        className={`max-w-[82%] rounded-[24px] px-4 py-3 ${
          isMine
            ? 'rounded-br-md bg-primary'
            : 'rounded-bl-md bg-surface-container'
        }`}
      >
        {message.isDeleted ? (
          <Text className={`text-[14px] italic ${isMine ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>
            This message was deleted
          </Text>
        ) : isEncrypted(message.content) ? (
          <DecryptingPlaceholder isMine={isMine} />
        ) : (
          <Text className={`text-[15px] leading-6 ${isMine ? 'text-on-primary' : 'text-on-surface'}`}>
            {message.content}
          </Text>
        )}
      </View>
    )
  }

  return (
    <View
      className={`${showTime ? 'mb-3' : 'mb-0.5'} ${isMine ? 'items-end' : 'items-start'}`}
      style={[
        message.status === 'sending' ? { opacity: 0.7 } : undefined,
        highlighted
          ? {
              backgroundColor: Colors.primaryContainer,
              borderRadius: 18,
              paddingHorizontal: 6,
              paddingVertical: 4,
            }
          : undefined,
      ]}
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
            {isEncrypted(message.replyTo.snippet) ? 'Decrypting…' : message.replyTo.snippet}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Pressable onLongPress={onLongPress} delayLongPress={300}>
        {renderBubble()}
      </Pressable>

      {reactionChips.length > 0 ? (
        <View className={`mt-1 flex-row flex-wrap gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          {reactionChips.map(chip => (
            GLASS ? (
              <TouchableOpacity
                key={chip.emoji}
                onPress={() => onToggleReaction?.(message.id, chip.emoji)}
              >
                <GlassView
                  tintColor={chip.mine ? `${Colors.primary}55` : 'rgba(255,255,255,0.18)'}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}
                >
                  <Text style={{ fontSize: 12 }}>{chip.emoji}</Text>
                  <Text className="text-[11px] font-semibold" style={{ color: chip.mine ? Colors.primary : Colors.onSurfaceVariant }}>
                    {chip.count}
                  </Text>
                </GlassView>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={chip.emoji}
                onPress={() => onToggleReaction?.(message.id, chip.emoji)}
                className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                style={{ backgroundColor: chip.mine ? Colors.primaryContainer : Colors.surfaceContainerHigh }}
              >
                <Text style={{ fontSize: 12 }}>{chip.emoji}</Text>
                <Text className="text-[11px] font-semibold" style={{ color: chip.mine ? Colors.onPrimary : Colors.onSurfaceVariant }}>
                  {chip.count}
                </Text>
              </TouchableOpacity>
            )
          ))}
        </View>
      ) : null}

      {trackReactionChips.length > 0 ? (
        <View className={`mt-1 flex-row flex-wrap gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          {trackReactionChips.map(chip => (
            <TrackReactionChip
              key={chip.track.id}
              track={chip.track}
              count={chip.count}
              mine={chip.mine}
            />
          ))}
        </View>
      ) : null}

      {showFooter ? (
      <View className={`mt-1 flex-row items-center gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {showTime ? (
          <Text className="text-[11px] font-medium text-on-surface-variant">{time}</Text>
        ) : null}
        {message.edited && !message.isDeleted ? (
          <Text className="text-[11px] font-medium text-on-surface-variant">edited</Text>
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
