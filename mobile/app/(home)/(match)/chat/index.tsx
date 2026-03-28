import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChatRequestListItem } from '@/components/chat/ChatRequestListItem'
import { ConversationListItem } from '@/components/chat/ConversationListItem'
import { NewConversationModal } from '@/components/chat/NewConversationModal'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { isEncrypted } from '@/lib/chat-crypto'

export default function ChatInboxScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()
  const {
    acceptDirectRequest,
    conversations,
    denyDirectRequest,
    decryptForUsername,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMoreConversations,
    refreshConversations,
  } = useChat()
  const [composerVisible, setComposerVisible] = useState(false)
  const [decryptedPreviews, setDecryptedPreviews] = useState<Record<string, string>>({})
  const [requestAction, setRequestAction] = useState<{
    action: 'accept' | 'deny'
    conversationId: string
  } | null>(null)
  const decryptedKeysRef = useRef(new Set<string>())
  const requestConversations = conversations.filter(
    conversation => conversation.requestStatus !== 'ACCEPTED',
  )
  const activeConversations = conversations.filter(
    conversation => conversation.requestStatus === 'ACCEPTED',
  )

  useEffect(() => {
    let cancelled = false

    async function decryptPreviews() {
      const updates: Record<string, string> = {}

      await Promise.all(
        conversations.map(async conversation => {
          if (!conversation.lastMessage || conversation.isGroup || !isEncrypted(conversation.lastMessage)) {
            return
          }

          const otherParticipant = conversation.participants.find(participant => participant.username !== user?.username)
          if (!otherParticipant) {
            return
          }

          const cacheKey = `${conversation.id}:${conversation.lastMessage}`
          if (decryptedKeysRef.current.has(cacheKey)) {
            return
          }

          const decrypted = await decryptForUsername(otherParticipant.username, conversation.lastMessage)
          updates[conversation.id] = decrypted
          decryptedKeysRef.current.add(cacheKey)
        }),
      )

      if (!cancelled && Object.keys(updates).length > 0) {
        setDecryptedPreviews(prev => ({ ...prev, ...updates }))
      }
    }

    void decryptPreviews()
    return () => {
      cancelled = true
    }
  }, [conversations, decryptForUsername, user?.username])

  return (
    <View className="flex-1 bg-surface">
      <View
        className="flex-row items-center justify-between bg-surface px-5 pb-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View>
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">
            Messages
          </Text>
          <Text className="mt-2 text-[15px] font-medium text-on-surface-variant">
            Requests and conversations in one place.
          </Text>
        </View>
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
          onPress={() => setComposerVisible(true)}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View className="px-5 pb-3">
        <TouchableOpacity
          className="flex-row items-center self-start rounded-full bg-surface-container px-3 py-2"
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.replace('/(home)/(match)')
            }
          }}
        >
          <Ionicons name="chevron-back" size={18} color={Colors.onSurface} />
          <Text className="ml-1 text-sm font-semibold text-on-surface">Back to People</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeConversations}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          flexGrow: activeConversations.length === 0 && requestConversations.length === 0 ? 1 : 0,
          paddingBottom: 120,
        }}
        ListHeaderComponent={requestConversations.length > 0 ? (
          <View className="pb-2 pt-1">
            <Text className="px-5 pb-3 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
              Chat Requests
            </Text>
            {requestConversations.map(conversation => (
              <ChatRequestListItem
                key={conversation.id}
                conversation={conversation}
                currentUsername={user?.username}
                busyAction={requestAction?.conversationId === conversation.id ? requestAction.action : null}
                onPress={() => {
                  router.push(`/(home)/(match)/chat/${conversation.id}` as never)
                }}
                onAccept={() => {
                  setRequestAction({ conversationId: conversation.id, action: 'accept' })
                  void acceptDirectRequest(conversation.id)
                    .catch(error => {
                      console.error('[chat] failed to accept request', error)
                    })
                    .finally(() => {
                      setRequestAction(current => (
                        current?.conversationId === conversation.id ? null : current
                      ))
                    })
                }}
                onDeny={() => {
                  setRequestAction({ conversationId: conversation.id, action: 'deny' })
                  void denyDirectRequest(conversation.id)
                    .catch(error => {
                      console.error('[chat] failed to deny request', error)
                    })
                    .finally(() => {
                      setRequestAction(current => (
                        current?.conversationId === conversation.id ? null : current
                      ))
                    })
                }}
              />
            ))}
            {activeConversations.length > 0 ? (
              <Text className="px-5 pb-3 pt-3 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Conversations
              </Text>
            ) : null}
          </View>
        ) : null}
        renderItem={({ item }) => (
          <ConversationListItem
            conversation={item}
            currentUsername={user?.username}
            preview={decryptedPreviews[item.id]}
            onPress={() => {
              router.push(`/(home)/(match)/chat/${item.id}` as never)
            }}
          />
        )}
        ListEmptyComponent={requestConversations.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            {isLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="chatbubble-ellipses-outline" size={44} color={Colors.onSurfaceVariant} />
                <Text className="mt-4 text-lg font-bold text-on-surface">No conversations yet</Text>
                <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                  Tap the plus button to send a new chat request.
                </Text>
              </>
            )}
          </View>
        ) : activeConversations.length === 0 ? (
          <View className="px-10 py-6">
            <Text className="text-center text-sm font-medium text-on-surface-variant">
              Accept a request or send a new one to start chatting.
            </Text>
          </View>
        ) : null}
        ListFooterComponent={isLoadingMore ? (
          <View className="py-4">
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : null}
        onEndReached={() => {
          if (hasMore && !isLoadingMore) {
            void loadMoreConversations()
          }
        }}
        onEndReachedThreshold={0.35}
        onRefresh={() => {
          void refreshConversations()
        }}
        refreshing={isLoading && conversations.length > 0}
        showsVerticalScrollIndicator={false}
      />

      <NewConversationModal
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
      />
    </View>
  )
}
