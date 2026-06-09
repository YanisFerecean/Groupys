import { Ionicons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { Image } from 'expo-image'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { MessageComposer } from '@/components/chat/MessageComposer'
import { NowPlayingPill } from '@/components/chat/NowPlayingPill'
import { NowPlayingTrackSheet } from '@/components/music/NowPlayingTrackSheet'
import { TrackPicker } from '@/components/music/TrackPicker'
import { AlbumPicker } from '@/components/music/AlbumPicker'
import { MusicUpsellSheet } from '@/components/music/MusicUpsellSheet'
import { MusicAttachSheet } from '@/components/chat/MusicAttachSheet'
import { ChatActionsContext, type ChatActions } from '@/components/chat/ChatActionsContext'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { useMusicGate } from '@/hooks/useMusicGate'
import { fetchMusicCurrentlyPlaying } from '@/lib/api'
import type { AlbumPayload, TrackPayload } from '@/models/ChatPayloads'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useModeration } from '@/hooks/useModeration'
import { logWarn } from '@/lib/logging'
import { publicProfilePath } from '@/lib/profileRoutes'
import { chatWs } from '@/lib/chat-ws'
import { setActiveConversationId } from '@/lib/activeChat'
import { timeAgo } from '@/lib/timeAgo'
import type { Message } from '@/models/Chat'

export default function ChatConversationScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>()
  const { user } = useUser()
  const { getToken } = useAuth()
  const { showModerationMenu } = useModeration()
  const musicGate = useMusicGate()
  const {
    acceptDirectRequest,
    conversations,
    cryptoReady,
    denyDirectRequest,
    fetchConversationById,
    getPublicKeyForUsername,
    getNowPlaying,
    isUserOnline,
    markConversationRead,
  } = useChat()
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId
  const conversation = conversations.find(item => item.id === conversationId)
  const otherParticipant = conversation?.participants.find(participant => participant.username !== user?.username) ?? null
  const activeConversationId = conversation ? conversationId ?? null : null
  const {
    hasMore,
    isLoading,
    isInitialLoadPending,
    isLoadingMore,
    loadMore,
    messages,
    resendMessage,
    sendMessage,
  } = useChatMessages(activeConversationId, otherParticipant?.username ?? null)

  // Track sharing (tickets 2.1 / 1.3).
  const [trackPickerOpen, setTrackPickerOpen] = useState(false)
  const [trackPickerQuery, setTrackPickerQuery] = useState('')
  // Richer music shares (tickets 2.2 / 2.3).
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false)
  const sendTrack = useCallback((track: TrackPayload) => {
    const label = track.artist ? `🎵 ${track.title} — ${track.artist}` : `🎵 ${track.title}`
    void sendMessage(label, {
      messageType: 'TRACK',
      payload: track as unknown as Record<string, unknown>,
    })
  }, [sendMessage])

  const sendAlbum = useCallback((album: AlbumPayload) => {
    const label = `💿 ${album.title} — ${album.artist}`
    void sendMessage(label, {
      messageType: 'ALBUM',
      payload: album as unknown as Record<string, unknown>,
    })
  }, [sendMessage])

  // Actions exposed to card renderers (ticket 5.1: taste-handshake CTAs).
  const otherUserId = otherParticipant?.userId
  const chatActions = useMemo<ChatActions>(() => ({
    openTrackPicker: (initialQuery?: string) => {
      setTrackPickerQuery(initialQuery ?? '')
      setTrackPickerOpen(true)
    },
    openPartnerProfile: otherUserId
      ? () => router.push(publicProfilePath(otherUserId, '(match)') as never)
      : undefined,
  }), [otherUserId, router])

  const handleMusicPress = useCallback(async () => {
    // Not connected → prompt to connect (manual picker is still reachable from the upsell flow).
    if (!musicGate.capability.connected) {
      musicGate.requireMusic('Share what you’re listening to')
      return
    }
    // Connected → share the current track instantly, else fall back to the manual picker.
    try {
      const token = await getToken()
      const current = await fetchMusicCurrentlyPlaying(token)
      if (current) {
        sendTrack({
          type: 'TRACK',
          id: '',
          title: current.title,
          artist: current.artist,
          artworkUrl: current.coverUrl ?? undefined,
        })
        return
      }
    } catch {
      // fall through to the picker
    }
    setTrackPickerOpen(true)
  }, [getToken, musicGate, sendTrack])
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [hasPartnerKey, setHasPartnerKey] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [requestAction, setRequestAction] = useState<'accept' | 'deny' | null>(null)
  const [conversationLoadFailed, setConversationLoadFailed] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const listRef = useRef<FlatList<Message>>(null)
  const isMountedRef = useRef(true)

  // While the keyboard is up, the KeyboardAvoidingView already lifts the composer past the
  // home-indicator inset; keeping our own bottom inset on top of that doubles the gap.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvt, () => setIsKeyboardVisible(true))
    const hideSub = Keyboard.addListener(hideEvt, () => setIsKeyboardVisible(false))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Mark this chat active while focused so its incoming-message banners are suppressed.
  useFocusEffect(
    useCallback(() => {
      setActiveConversationId(conversationId ?? null)
      return () => setActiveConversationId(null)
    }, [conversationId]),
  )

  useEffect(() => {
    setConversationLoadFailed(false)
  }, [conversationId])

  useEffect(() => {
    if (!conversationId || conversation) {
      return
    }

    let cancelled = false

    void fetchConversationById(conversationId).then((loaded) => {
      if (!cancelled && !loaded) {
        setConversationLoadFailed(true)
      }
    })

    return () => {
      cancelled = true
    }
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
  // Live now-playing pill (ticket 1.2): show only when the partner has a track and is playing.
  const partnerNowPlaying = otherParticipant ? getNowPlaying(otherParticipant.userId) : null
  const partnerTrack = partnerNowPlaying?.track && partnerNowPlaying.isPlaying
    ? partnerNowPlaying.track
    : null
  const [nowPlayingSheetOpen, setNowPlayingSheetOpen] = useState(false)
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

  // Group consecutive messages from the same sender within the same minute: only the
  // newest message of a group (lowest index in this inverted list) shows the time/receipt.
  const showTimeForIndex = useCallback(
    (index: number) => {
      const message = messages[index]
      if (!message) return true
      const newer = messages[index - 1] // chronologically newer neighbor (inverted list)
      if (!newer) return true
      if (newer.senderUsername !== message.senderUsername) return true
      const bucket = (ts: string) => Math.floor(new Date(ts).getTime() / 60000)
      return bucket(newer.createdAt) !== bucket(message.createdAt)
    },
    [messages],
  )

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
    <ChatActionsContext.Provider value={chatActions}>
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-row items-center gap-3 border-b border-surface-container-high bg-surface px-4 pb-2"
        style={{ paddingTop: insets.top + 2 }}
      >
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={otherParticipant ? 0.8 : 1}
          disabled={!otherParticipant}
          onPress={() => {
            if (!otherParticipant) return
            router.push(publicProfilePath(otherParticipant.userId, '(match)') as never)
          }}
        >
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
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1"
          activeOpacity={otherParticipant ? 0.8 : 1}
          disabled={!otherParticipant}
          onPress={() => {
            if (!otherParticipant) return
            router.push(publicProfilePath(otherParticipant.userId, '(match)') as never)
          }}
        >
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
          {partnerTrack ? (
            <NowPlayingPill track={partnerTrack} onPress={() => setNowPlayingSheetOpen(true)} />
          ) : null}
        </TouchableOpacity>

        {otherParticipant ? (
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
            accessibilityLabel="Conversation options"
            onPress={() =>
              showModerationMenu({
                targetType: 'USER',
                targetId: otherParticipant.userId,
                userId: otherParticipant.userId,
                displayName: headerTitle,
                onBlocked: () => router.replace('/(home)/(match)/chat'),
              })
            }
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!conversation ? (
        <View className="flex-1 items-center justify-center">
          {conversationLoadFailed ? (
            <View className="items-center px-8">
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.onSurfaceVariant} />
              <Text className="mt-4 text-lg font-bold text-on-surface">Conversation unavailable</Text>
              <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                This chat could not be opened from your account.
              </Text>
              <TouchableOpacity
                className="mt-6 rounded-full bg-primary px-6 py-3"
                onPress={() => router.replace('/(home)/(match)/chat')}
              >
                <Text className="text-sm font-bold text-on-primary">Back to chats</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ActivityIndicator color={Colors.primary} />
          )}
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
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                isMine={item.senderUsername === user?.username}
                showSeen={item.id === lastSeenMessageId}
                showTime={showTimeForIndex(index)}
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

          <View style={{ paddingBottom: isKeyboardVisible ? 0 : insets.bottom }}>
            <MessageComposer
              conversationId={conversationId}
              disabled={!canMessage}
              onSend={(content) => {
                void sendMessage(content)
              }}
              onMusicPress={() => {
                void handleMusicPress()
              }}
              onAttachPress={() => setAttachMenuOpen(true)}
            />
          </View>
        </>
      )}

      <NowPlayingTrackSheet
        visible={nowPlayingSheetOpen}
        track={partnerTrack}
        onClose={() => setNowPlayingSheetOpen(false)}
      />

      <TrackPicker
        visible={trackPickerOpen}
        initialQuery={trackPickerQuery}
        onClose={() => setTrackPickerOpen(false)}
        onSelect={(track) => {
          setTrackPickerOpen(false)
          sendTrack(track)
        }}
      />

      <MusicAttachSheet
        visible={attachMenuOpen}
        onClose={() => setAttachMenuOpen(false)}
        onPickAlbum={() => setAlbumPickerOpen(true)}
      />

      <AlbumPicker
        visible={albumPickerOpen}
        onClose={() => setAlbumPickerOpen(false)}
        onSelect={(album) => {
          setAlbumPickerOpen(false)
          sendAlbum(album)
        }}
      />

      <MusicUpsellSheet
        visible={musicGate.upsell.visible}
        mode={musicGate.upsell.mode}
        action={musicGate.upsell.action}
        onClose={musicGate.closeUpsell}
      />
    </KeyboardAvoidingView>
    </ChatActionsContext.Provider>
  )
}
