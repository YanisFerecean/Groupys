import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@clerk/expo'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { MessageComposer } from '@/components/chat/MessageComposer'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { useChatMessages } from '@/hooks/useChatMessages'
import { logWarn } from '@/lib/logging'
import { chatWs } from '@/lib/chat-ws'
import { timeAgo } from '@/lib/timeAgo'
import type { Message } from '@/models/Chat'

export default function ChatConversationScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>()
  const { user } = useUser()
  const {
    acceptDirectRequest,
    conversations,
    cryptoReady,
    denyDirectRequest,
    fetchConversationById,
    getPublicKeyForUsername,
    isUserOnline,
    markConversationRead,
  } = useChat()
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId
  const conversation = conversations.find(item => item.id === conversationId)
  const otherParticipant = conversation?.participants.find(participant => participant.username !== user?.username) ?? null
  const {
    hasMore,
    isLoading,
    isInitialLoadPending,
    isLoadingMore,
    loadMore,
    messages,
    resendMessage,
    sendMessage,
  } = useChatMessages(conversationId ?? null, otherParticipant?.username ?? null)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [hasPartnerKey, setHasPartnerKey] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [requestAction, setRequestAction] = useState<'accept' | 'deny' | null>(null)
  const listRef = useRef<FlatList<Message>>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!conversationId || conversation) {
      return
    }

    void fetchConversationById(conversationId)
  }, [conversation, conversationId, fetchConversationById])

  useEffect(() => {
    let cancelled = false

    async function checkPartnerKey() {
      if (!otherParticipant?.username) {
        setHasPartnerKey(false)
        return
      }

      const publicKey = await getPublicKeyForUsername(otherParticipant.username)
      if (!cancelled) {
        setHasPartnerKey(Boolean(publicKey))
      }
    }

    void checkPartnerKey()
    return () => {
      cancelled = true
    }
  }, [getPublicKeyForUsername, otherParticipant?.username])

  useEffect(() => {
    if (!conversationId) {
      return
    }

    return chatWs.on('TYPING', (payload: {
      conversationId: string
      userId: string
      username: string
      isTyping: boolean
    }) => {
      if (payload.conversationId !== conversationId || payload.username === user?.username) {
        return
      }

      setTypingUsers(prev => {
        const next = new Map(prev)
        if (payload.isTyping) {
          next.set(payload.userId, payload.username)
        } else {
          next.delete(payload.userId)
        }
        return next
      })
    })
  }, [conversationId, user?.username])

  useEffect(() => {
    if (conversationId && conversation?.unreadCount && messages.length > 0) {
      void markConversationRead(conversationId)
    }
  }, [conversation?.unreadCount, conversationId, markConversationRead, messages.length])

  const typingUsername = Array.from(typingUsers.values())[0] ?? null
  const newestMessageKey = messages[0]?.id ?? messages[0]?.tempId

  useEffect(() => {
    if (!isNearBottom) {
      return
    }

    const frame = requestAnimationFrame(() => {
      if (!isMountedRef.current) {
        return
      }

      try {
        listRef.current?.scrollToOffset({ offset: 0, animated: true })
      } catch (error) {
        logWarn('Skipped chat auto-scroll after unmount/layout change', error)
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [isNearBottom, newestMessageKey, typingUsername])

  const headerTitle = otherParticipant?.displayName || otherParticipant?.username || 'Chat'
  const lastSeenText = useMemo(() => {
    if (!otherParticipant?.lastSeenAt || isUserOnline(otherParticipant.userId)) {
      return null
    }

    const relative = timeAgo(otherParticipant.lastSeenAt)
    return relative === 'just now'
      ? 'last seen just now'
      : `last seen ${relative}`
  }, [isUserOnline, otherParticipant?.lastSeenAt, otherParticipant?.userId])

  const lastSeenMessageId = useMemo(() => {
    if (!otherParticipant?.lastReadAt || !user?.username) {
      return null
    }

    const readAt = new Date(otherParticipant.lastReadAt)
    return messages.find(message => (
      message.senderUsername === user.username
      && message.status !== 'sending'
      && new Date(message.createdAt) <= readAt
    ))?.id ?? null
  }, [messages, otherParticipant?.lastReadAt, user?.username])

  const encryptedActive = cryptoReady && hasPartnerKey
  const isPendingIncoming = conversation?.requestStatus === 'PENDING_INCOMING'
  const isPendingOutgoing = conversation?.requestStatus === 'PENDING_OUTGOING'
  const canMessage = conversation?.requestStatus === 'ACCEPTED'
  const showMessageListLoader = isLoading || isInitialLoadPending
  const renderEmptyState = () => (
    <View
      className="flex-1 items-center justify-center px-10 py-10"
      style={{ transform: [{ scaleY: -1 }] }}
    >
      {showMessageListLoader ? (
        <ActivityIndicator color={Colors.primary} />
      ) : isPendingIncoming ? (
        <>
          <Ionicons name="mail-unread-outline" size={40} color={Colors.primary} />
          <Text className="mt-4 text-lg font-bold text-on-surface">Chat request pending</Text>
          <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
            Accept this request to start messaging {headerTitle}.
          </Text>
        </>
      ) : isPendingOutgoing ? (
        <>
          <Ionicons name="time-outline" size={40} color={Colors.onSurfaceVariant} />
          <Text className="mt-4 text-lg font-bold text-on-surface">Waiting for a reply</Text>
          <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
            You can message {headerTitle} after they accept your request.
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="sparkles-outline" size={40} color={Colors.onSurfaceVariant} />
          <Text className="mt-4 text-lg font-bold text-on-surface">Say hello</Text>
          <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
            Start the conversation with your first message.
          </Text>
        </>
      )}
    </View>
  )

  if (!conversationId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-base font-medium text-on-surface-variant">Conversation not found.</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-row items-center gap-3 border-b border-surface-container-high bg-surface px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>

        {otherParticipant?.profileImage ? (
          <Image
            source={{ uri: otherParticipant.profileImage }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            contentFit="cover"
          />
        ) : (
          <View
            className="items-center justify-center rounded-full bg-primary/10"
            style={{ width: 44, height: 44 }}
          >
            <Text className="text-base font-bold text-primary">
              {headerTitle.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-on-surface" numberOfLines={1}>
              {headerTitle}
            </Text>
            {encryptedActive ? (
              <Ionicons name="lock-closed" size={12} color={Colors.primary} />
            ) : null}
          </View>
          {otherParticipant ? (
            isUserOnline(otherParticipant.userId) ? (
              <Text className="text-xs font-semibold text-primary">Online</Text>
            ) : lastSeenText ? (
              <Text className="text-xs font-medium text-on-surface-variant">{lastSeenText}</Text>
            ) : null
          ) : null}
        </View>
      </View>

      {!conversation ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <>
          {isPendingIncoming ? (
            <View className="mx-4 mt-4 rounded-3xl bg-primary/10 p-4">
              <Text className="text-base font-bold text-on-surface">
                {headerTitle} wants to chat
              </Text>
              <Text className="mt-2 text-sm font-medium text-on-surface-variant">
                Accept to open the conversation, or deny to remove this request from your inbox.
              </Text>
              <View className="mt-4 flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 items-center justify-center rounded-2xl bg-surface px-4 py-3"
                  disabled={requestAction !== null}
                  onPress={() => {
                    setRequestAction('deny')
                    void denyDirectRequest(conversation.id)
                      .then(() => {
                        router.replace('/(home)/(match)/chat')
                      })
                      .catch(error => {
                        console.error('[chat] failed to deny request', error)
                      })
                      .finally(() => {
                        setRequestAction(null)
                      })
                  }}
                >
                  {requestAction === 'deny' ? (
                    <ActivityIndicator color={Colors.onSurface} />
                  ) : (
                    <Text className="text-sm font-bold text-on-surface">Deny</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 items-center justify-center rounded-2xl bg-primary px-4 py-3"
                  disabled={requestAction !== null}
                  onPress={() => {
                    setRequestAction('accept')
                    void acceptDirectRequest(conversation.id)
                      .catch(error => {
                        console.error('[chat] failed to accept request', error)
                      })
                      .finally(() => {
                        setRequestAction(null)
                      })
                  }}
                >
                  {requestAction === 'accept' ? (
                    <ActivityIndicator color={Colors.onPrimary} />
                  ) : (
                    <Text className="text-sm font-bold text-on-primary">Accept</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {isPendingOutgoing ? (
            <View className="mx-4 mt-4 rounded-3xl bg-surface-container p-4">
              <Text className="text-base font-bold text-on-surface">
                Request sent
              </Text>
              <Text className="mt-2 text-sm font-medium text-on-surface-variant">
                You&apos;ll be able to send messages here after {headerTitle} accepts your request.
              </Text>
            </View>
          ) : null}

          <FlatList
            ref={listRef}
            inverted
            data={messages}
            keyExtractor={item => item.tempId ? `${item.id}:${item.tempId}` : item.id}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
            }}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isMine={item.senderUsername === user?.username}
                showSeen={item.id === lastSeenMessageId}
                onRetry={item.status === 'failed' && item.tempId
                  ? () => {
                      void resendMessage(item.tempId!, item.content)
                    }
                  : undefined}
              />
            )}
            ListEmptyComponent={renderEmptyState}
            ListHeaderComponent={typingUsername ? <TypingIndicator username={typingUsername} /> : null}
            ListFooterComponent={(
              <View className="pb-3 pt-2">
                {isLoadingMore ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : null}
                {!hasMore && messages.length > 0 ? (
                  <Text className="mt-3 text-center text-xs font-medium text-on-surface-variant">
                    This is the beginning of the conversation.
                  </Text>
                ) : null}
              </View>
            )}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onEndReached={() => {
              if (hasMore && !isLoadingMore) {
                void loadMore()
              }
            }}
            onEndReachedThreshold={0.25}
            onScroll={event => {
              setIsNearBottom(event.nativeEvent.contentOffset.y < 120)
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />

          <View style={{ paddingBottom: insets.bottom }}>
            <MessageComposer
              conversationId={conversationId}
              disabled={!canMessage}
              onSend={(content) => {
                void sendMessage(content)
              }}
            />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  )
}
