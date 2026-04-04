import { Ionicons } from '@expo/vector-icons'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@clerk/expo'
import UserRecommendationCard, { type CardHandle } from '@/components/match/UserRecommendationCard'
import ActionButtons from '@/components/match/ActionButtons'
import MatchCelebrationModal from '@/components/match/MatchCelebrationModal'
import SwipeableTabScreen from '@/components/navigation/SwipeableTabScreen'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { useDiscovery } from '@/hooks/useDiscovery'
import { publicProfilePath } from '@/lib/profileRoutes'
import { useMatches } from '@/hooks/useMatches'

export default function MatchScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const router = useRouter()
  const { isLoaded } = useAuth()
  const { conversations, totalUnread } = useChat()
  const { width, height } = useWindowDimensions()

  const cardRef = useRef<CardHandle>(null)
  const [headerHeight, setHeaderHeight] = useState(88)
  const [actionsHeight, setActionsHeight] = useState(140)

  const {
    users,
    usersLoading,
    loadUsers,
    like,
    dismiss,
  } = useDiscovery()

  const { matches, loadMatches } = useMatches()

  const excludedUserIds = useMemo(() => {
    const ids = new Set<string>()
    conversations.forEach((conversation) => {
      if (conversation.isGroup) return
      conversation.participants.forEach((participant) => {
        ids.add(participant.userId)
      })
    })
    matches.forEach((match) => {
      ids.add(match.otherUserId)
    })
    return ids
  }, [conversations, matches])

  const filteredUsers = useMemo(
    () => users.filter((user) => !excludedUserIds.has(user.userId)),
    [excludedUserIds, users],
  )

  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) {
        return
      }

      void loadUsers()
      void loadMatches()
    }, [isLoaded, loadMatches, loadUsers]),
  )

  // Card dimensions: full width minus horizontal padding, 3:4 aspect ratio
  const cardAspectRatio = 3 / 4
  const footerHeight = !usersLoading && filteredUsers.length > 0
    ? actionsHeight
    : tabBarHeight + 24
  const availableCardHeight = Math.max(
    0,
    height - headerHeight - footerHeight - 32,
  )
  const CARD_WIDTH = Math.max(
    0,
    Math.min(width - 40, availableCardHeight * cardAspectRatio),
  )
  const CARD_HEIGHT = CARD_WIDTH / cardAspectRatio

  const handleLike = () => {
    if (filteredUsers.length === 0) return
    cardRef.current?.swipeRight()
  }

  const handlePass = () => {
    if (filteredUsers.length === 0) return
    cardRef.current?.swipeLeft()
  }

  const visibleUsers = filteredUsers.slice(0, 3)

  return (
    <SwipeableTabScreen tab="(match)">
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">Mutuals</Text>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
              onPress={() => router.push('/(home)/(match)/history')}
            >
              <Ionicons name="time-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="relative h-11 w-11 items-center justify-center rounded-full bg-surface-container"
              onPress={() => router.push('/(home)/(match)/chat')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.primary} />
              {totalUnread > 0 ? (
                <View
                  className="absolute -right-1 -top-1 items-center justify-center rounded-full bg-primary"
                  style={{ minWidth: 20, height: 20, paddingHorizontal: 5 }}
                >
                  <Text className="text-[11px] font-bold text-on-primary">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        {/* Card stack area */}
        <View className="flex-1 items-center justify-center px-5 py-4" style={{ minHeight: 0 }}>
          {usersLoading ? (
            <View className="items-center gap-3">
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text className="text-on-surface-variant font-medium">Finding mutuals...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View className="items-center gap-3">
              <Ionicons name="musical-notes-outline" size={52} color={Colors.onSurfaceVariant} />
              <Text className="text-on-surface-variant text-base font-medium text-center">
                No one new to show right now
              </Text>
              <TouchableOpacity
                onPress={() => loadUsers(true)}
                className="mt-2 bg-primary px-6 py-3 rounded-full"
              >
                <Text className="text-on-primary font-bold">Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT, position: 'relative' }}>
              {visibleUsers.slice().reverse().map((user, reverseIdx) => {
                const stackIndex = visibleUsers.length - 1 - reverseIdx
                return (
                  <UserRecommendationCard
                    key={user.userId}
                    ref={stackIndex === 0 ? cardRef : undefined}
                    user={user}
                    stackIndex={stackIndex}
                    onLike={() => like(user)}
                    onDismiss={() => dismiss('user', user.userId)}
                    onViewProfile={() => router.push(publicProfilePath(user.userId, '(match)') as any)}
                  />
                )
              })}
            </View>
          )}
        </View>

        {/* Action buttons */}
        {!usersLoading && filteredUsers.length > 0 && (
          <View
            onLayout={(event) => setActionsHeight(event.nativeEvent.layout.height)}
            className="items-center pt-4"
            style={{ paddingBottom: tabBarHeight + 12 }}
          >
            <ActionButtons
              onPass={handlePass}
              onLike={handleLike}
            />
          </View>
        )}

        {/* Match celebration modal */}
        <MatchCelebrationModal />
      </View>
    </SwipeableTabScreen>
  )
}
