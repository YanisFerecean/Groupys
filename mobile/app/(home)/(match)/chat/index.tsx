import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@clerk/expo'
import { SymbolView } from 'expo-symbols'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { ConversationListItem } from '@/components/chat/ConversationListItem'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { isEncrypted } from '@/lib/chat-crypto'
import { publicProfilePath } from '@/lib/profileRoutes'

const CONVERSATION_RENDER_BATCH = 12

export default function ChatInboxScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const useGlass = isLiquidGlassAvailable()
  const { user } = useUser()
  const {
    conversations,
    decryptForUsername,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMoreConversations,
    refreshConversations,
  } = useChat()

  const [decryptedPreviews, setDecryptedPreviews] = useState<Record<string, string>>({})
  const [visibleConversationCount, setVisibleConversationCount] = useState(CONVERSATION_RENDER_BATCH)
  const decryptedKeysRef = useRef(new Set<string>())

  const requestConversations = conversations.filter(
    conversation => conversation.requestStatus !== 'ACCEPTED',
  )
  const activeConversations = conversations.filter(
    conversation => conversation.requestStatus === 'ACCEPTED',
  )
  const visibleActiveConversations = activeConversations.slice(0, visibleConversationCount)
  const hasHiddenConversations = visibleConversationCount < activeConversations.length
  const hasChatRequests = requestConversations.length > 0

  useEffect(() => {
    setVisibleConversationCount(previous => {
      if (activeConversations.length === 0) {
        return CONVERSATION_RENDER_BATCH
      }
      if (previous > activeConversations.length) {
        return activeConversations.length
      }
      if (previous < CONVERSATION_RENDER_BATCH) {
        return Math.min(CONVERSATION_RENDER_BATCH, activeConversations.length)
      }
      return previous
    })
  }, [activeConversations.length])

  const handleLoadMore = () => {
    if (hasHiddenConversations) {
      setVisibleConversationCount(previous =>
        Math.min(previous + CONVERSATION_RENDER_BATCH, activeConversations.length),
      )
      return
    }

    if (hasMore && !isLoadingMore && !isLoading) {
      void loadMoreConversations()
    }
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(home)/(match)')
    }
  }

  const handleOpenComposer = () => {
    router.push('/(home)/(match)/chat/new' as never)
  }

  const handleOpenRequests = () => {
    router.push('/(home)/(match)/chat/requests' as never)
  }

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
        <View className="flex-1 flex-row items-center gap-3 pr-4">
          {useGlass ? (
            <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                onPress={handleBack}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={20} color="#000000" />
              </TouchableOpacity>
            </GlassView>
          ) : (
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center self-start rounded-full bg-surface-container"
              onPress={handleBack}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={20} color="#000000" />
            </TouchableOpacity>
          )}

          <View className="flex-1">
            <Text className="text-4xl font-extrabold tracking-tighter text-primary">
              DMs
            </Text>
          </View>
        </View>
        {useGlass ? (
          <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full"
              onPress={handleOpenComposer}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
            onPress={handleOpenComposer}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {hasChatRequests ? (
        <View className="px-5 pb-3">
          <View className="flex-row items-center gap-3">
            {useGlass ? (
              <GlassView style={{ flex: 1, borderRadius: 999, overflow: 'hidden' }} isInteractive>
                <TouchableOpacity
                  onPress={handleOpenRequests}
                  className="px-4 py-3"
                  activeOpacity={0.85}
                >
                  <Text className="text-sm font-semibold tracking-wide text-primary">Chat Request</Text>
                </TouchableOpacity>
              </GlassView>
            ) : (
              <TouchableOpacity
                className="flex-1 rounded-full bg-surface-container px-4 py-3"
                onPress={handleOpenRequests}
                activeOpacity={0.85}
              >
                <Text className="text-sm font-semibold tracking-wide text-primary">Chat Request</Text>
              </TouchableOpacity>
            )}

            {useGlass ? (
              <GlassView style={{ borderRadius: 999, overflow: 'hidden' }} isInteractive>
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center rounded-full"
                  onPress={handleOpenRequests}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </GlassView>
            ) : (
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
                onPress={handleOpenRequests}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}

      <FlatList
        data={visibleActiveConversations}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          flexGrow: activeConversations.length === 0 ? 1 : 0,
          paddingBottom: 120,
        }}
        initialNumToRender={CONVERSATION_RENDER_BATCH}
        maxToRenderPerBatch={CONVERSATION_RENDER_BATCH}
        windowSize={9}
        removeClippedSubviews
        renderItem={({ item }) => {
          const otherParticipant = item.participants.find(
            participant => participant.username !== user?.username,
          )

          return (
            <ConversationListItem
              conversation={item}
              currentUsername={user?.username}
              preview={decryptedPreviews[item.id]}
              useGlass={useGlass}
              onProfilePress={otherParticipant
                ? () => {
                    router.push(publicProfilePath(otherParticipant.userId, '(match)') as never)
                  }
                : undefined}
              onPress={() => {
                router.push(`/(home)/(match)/chat/${item.id}` as never)
              }}
            />
          )
        }}
        ListEmptyComponent={(
          <View className="flex-1 items-center justify-center px-10">
            {isLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                {Platform.OS === 'ios' ? (
                  <SymbolView name="paperplane.fill" size={42} tintColor={Colors.onSurfaceVariant} />
                ) : (
                  <Ionicons name="paper-plane-outline" size={42} color={Colors.onSurfaceVariant} />
                )}
                <Text className="mt-4 text-lg font-bold text-on-surface">No conversations yet</Text>
                <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                  Tap the plus button to send a new chat request.
                </Text>
              </>
            )}
          </View>
        )}
        ListFooterComponent={
          isLoadingMore ? (
            <View className="py-4">
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : hasHiddenConversations || hasMore ? (
            <View className="items-center pb-3 pt-2">
              <TouchableOpacity
                onPress={handleLoadMore}
                className="rounded-full bg-surface-container px-4 py-2"
                activeOpacity={0.8}
              >
                <Text className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Load more
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        onRefresh={() => {
          setVisibleConversationCount(CONVERSATION_RENDER_BATCH)
          void refreshConversations()
        }}
        refreshing={isLoading && conversations.length > 0}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}
