import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChatRequestListItem } from '@/components/chat/ChatRequestListItem'
import { buildMockRequestConversations } from '@/constants/chatRequestMockData'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { publicProfilePath } from '@/lib/profileRoutes'
import type { Conversation } from '@/models/Chat'

type RequestTab = 'incoming' | 'outgoing'

const REQUEST_TABS: { key: RequestTab; label: string }[] = [
  { key: 'incoming', label: 'Requesting You' },
  { key: 'outgoing', label: 'Requested' },
]

const MOCK_REQUEST_COUNT = 8
const TAB_SWITCHER_PADDING = 6
const TAB_SWITCHER_GAP = 6

function TabSlideTransition({
  transitionKey,
  direction,
  children,
}: {
  transitionKey: string
  direction: 1 | -1
  children: ReactNode
}) {
  const opacity = useRef(new Animated.Value(1)).current
  const translateX = useRef(new Animated.Value(0)).current
  const [renderedKey, setRenderedKey] = useState(transitionKey)
  const [renderedChildren, setRenderedChildren] = useState(children)

  useEffect(() => {
    if (transitionKey === renderedKey) {
      setRenderedChildren(children)
      return
    }

    let cancelled = false
    opacity.stopAnimation()
    translateX.stopAnimation()

    const exitOffset = direction === 1 ? -24 : 24
    const enterOffset = direction === 1 ? 24 : -24

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: exitOffset,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished || cancelled) return

      setRenderedKey(transitionKey)
      setRenderedChildren(children)
      translateX.setValue(enterOffset)
      opacity.setValue(0)

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start()
      })
    })

    return () => {
      cancelled = true
      opacity.stopAnimation()
      translateX.stopAnimation()
    }
  }, [children, direction, opacity, renderedKey, transitionKey, translateX])

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateX }] }}>
      {renderedChildren}
    </Animated.View>
  )
}

export default function ChatRequestsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const useGlass = isLiquidGlassAvailable()
  const { user } = useUser()
  const {
    acceptDirectRequest,
    conversations,
    denyDirectRequest,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMoreConversations,
    refreshConversations,
  } = useChat()

  const [activeTab, setActiveTab] = useState<RequestTab>('incoming')
  const [tabDirection, setTabDirection] = useState<1 | -1>(1)
  const [tabBarWidth, setTabBarWidth] = useState(0)
  const [requestAction, setRequestAction] = useState<{
    action: 'accept' | 'deny'
    conversationId: string
  } | null>(null)
  const [dismissedMockRequestIds, setDismissedMockRequestIds] = useState<Set<string>>(() => new Set())
  const tabIndicatorX = useRef(new Animated.Value(0)).current
  const tabIndicatorInitializedRef = useRef(false)
  const mockRequestConversationsRef = useRef<Conversation[]>(
    buildMockRequestConversations(MOCK_REQUEST_COUNT),
  )

  const realRequestConversations = conversations.filter(
    conversation => conversation.requestStatus !== 'ACCEPTED',
  )
  const mockRequestConversations = useMemo(
    () =>
      mockRequestConversationsRef.current.filter(
        conversation => !dismissedMockRequestIds.has(conversation.id),
      ),
    [dismissedMockRequestIds],
  )
  const usingMockRequests = realRequestConversations.length === 0 && !isLoading
  const displayedRequestConversations = usingMockRequests
    ? mockRequestConversations
    : realRequestConversations

  const incomingRequests = displayedRequestConversations.filter(
    conversation => conversation.requestStatus === 'PENDING_INCOMING',
  )
  const outgoingRequests = displayedRequestConversations.filter(
    conversation => conversation.requestStatus === 'PENDING_OUTGOING',
  )

  const tabIndicatorWidth = tabBarWidth > 0
    ? Math.max(0, (tabBarWidth - (TAB_SWITCHER_PADDING * 2) - TAB_SWITCHER_GAP) / REQUEST_TABS.length)
    : 0
  const tabIndicatorTargetX = TAB_SWITCHER_PADDING
    + (activeTab === 'outgoing' ? tabIndicatorWidth + TAB_SWITCHER_GAP : 0)

  useEffect(() => {
    if (tabIndicatorWidth <= 0) return

    if (!tabIndicatorInitializedRef.current) {
      tabIndicatorX.setValue(tabIndicatorTargetX)
      tabIndicatorInitializedRef.current = true
      return
    }

    Animated.spring(tabIndicatorX, {
      toValue: tabIndicatorTargetX,
      damping: 20,
      mass: 0.8,
      stiffness: 230,
      useNativeDriver: true,
    }).start()
  }, [tabIndicatorTargetX, tabIndicatorWidth, tabIndicatorX])

  const handleAccept = (conversation: Conversation) => {
    const isMockRequest = conversation.id.startsWith('mock-request-')
    if (isMockRequest) {
      setDismissedMockRequestIds((prev) => new Set(prev).add(conversation.id))
      return
    }

    setRequestAction({ conversationId: conversation.id, action: 'accept' })
    void acceptDirectRequest(conversation.id)
      .catch(error => {
        console.error('[chat] failed to accept request', error)
      })
      .finally(() => {
        setRequestAction((current) => (
          current?.conversationId === conversation.id ? null : current
        ))
      })
  }

  const handleDeny = (conversation: Conversation) => {
    const isMockRequest = conversation.id.startsWith('mock-request-')
    if (isMockRequest) {
      setDismissedMockRequestIds((prev) => new Set(prev).add(conversation.id))
      return
    }

    setRequestAction({ conversationId: conversation.id, action: 'deny' })
    void denyDirectRequest(conversation.id)
      .catch(error => {
        console.error('[chat] failed to deny request', error)
      })
      .finally(() => {
        setRequestAction((current) => (
          current?.conversationId === conversation.id ? null : current
        ))
      })
  }

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      void loadMoreConversations()
    }
  }

  const handleTabChange = (nextTab: RequestTab) => {
    if (nextTab === activeTab) return
    setTabDirection(nextTab === 'outgoing' ? 1 : -1)
    setActiveTab(nextTab)
  }

  const renderRequestList = (
    data: Conversation[],
    emptyState: {
      icon: keyof typeof Ionicons.glyphMap
      title: string
      description: string
    },
  ) => (
    <FlatList
      data={data}
      key={`${activeTab}-${usingMockRequests ? 'mock' : 'real'}`}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        flexGrow: data.length === 0 ? 1 : 0,
        paddingBottom: 120,
      }}
      renderItem={({ item }) => {
        const otherParticipant = item.participants.find(
          participant => participant.username !== user?.username,
        )
        const isMockRequest = item.id.startsWith('mock-request-')

        return (
          <ChatRequestListItem
            conversation={item}
            currentUsername={user?.username}
            useGlass={useGlass}
            busyAction={requestAction?.conversationId === item.id ? requestAction.action : null}
            onProfilePress={!isMockRequest && otherParticipant
              ? () => {
                  router.push(publicProfilePath(otherParticipant.userId, '(match)') as never)
                }
              : undefined}
            onPress={() => {
              if (isMockRequest) return
              router.push(`/(home)/(match)/chat/${item.id}` as never)
            }}
            onAccept={() => handleAccept(item)}
            onDeny={() => handleDeny(item)}
          />
        )
      }}
      ListEmptyComponent={(
        <View className="flex-1 items-center justify-center px-10">
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <Ionicons name={emptyState.icon} size={42} color={Colors.onSurfaceVariant} />
              <Text className="mt-4 text-lg font-bold text-on-surface">{emptyState.title}</Text>
              <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                {emptyState.description}
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
        ) : null
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.35}
      onRefresh={() => {
        setDismissedMockRequestIds(new Set())
        void refreshConversations()
      }}
      refreshing={isLoading && realRequestConversations.length > 0}
      showsVerticalScrollIndicator={false}
    />
  )

  const incomingList = renderRequestList(incomingRequests, {
    icon: 'mail-open-outline',
    title: 'No incoming requests',
    description: 'When someone asks to chat, it will appear here.',
  })

  const outgoingList = renderRequestList(outgoingRequests, {
    icon: 'paper-plane-outline',
    title: 'No sent requests',
    description: 'Chat requests you send will appear here until accepted.',
  })

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
        <View className="mb-3 flex-row items-center gap-3">
          {useGlass ? (
            <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                onPress={() => router.back()}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </GlassView>
          ) : (
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-surface-container"
              onPress={() => router.back()}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          )}

          <Text className="text-4xl font-extrabold tracking-tighter text-primary">
            Chat Requests
          </Text>
        </View>

        {useGlass ? (
          <GlassView style={{ borderRadius: 999, overflow: 'hidden' }}>
            <View
              className="flex-row"
              style={{ padding: TAB_SWITCHER_PADDING, gap: TAB_SWITCHER_GAP, position: 'relative' }}
              onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
            >
              {tabIndicatorWidth > 0 ? (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: TAB_SWITCHER_PADDING,
                    bottom: TAB_SWITCHER_PADDING,
                    left: 0,
                    width: tabIndicatorWidth,
                    borderRadius: 999,
                    backgroundColor: `${Colors.primary}1F`,
                    transform: [{ translateX: tabIndicatorX }],
                  }}
                />
              ) : null}
              {REQUEST_TABS.map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => handleTabChange(tab.key)}
                    activeOpacity={0.85}
                    className="flex-1 items-center rounded-full px-3 py-2.5"
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        isActive ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </GlassView>
        ) : (
          <View
            className="flex-row rounded-full bg-surface-container"
            style={{ padding: TAB_SWITCHER_PADDING, gap: TAB_SWITCHER_GAP, position: 'relative' }}
            onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
          >
            {tabIndicatorWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: TAB_SWITCHER_PADDING,
                  bottom: TAB_SWITCHER_PADDING,
                  left: 0,
                  width: tabIndicatorWidth,
                  borderRadius: 999,
                  backgroundColor: `${Colors.primary}1F`,
                  transform: [{ translateX: tabIndicatorX }],
                }}
              />
            ) : null}
            {REQUEST_TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => handleTabChange(tab.key)}
                  activeOpacity={0.85}
                  className="flex-1 items-center rounded-full px-3 py-2.5"
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>

      <TabSlideTransition transitionKey={activeTab} direction={tabDirection}>
        {activeTab === 'incoming' ? incomingList : outgoingList}
      </TabSlideTransition>
    </View>
  )
}
