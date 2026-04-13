import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useCallback, useMemo, useRef } from 'react'
import { ActivityIndicator, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@clerk/expo'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import ActionButtons from '@/components/match/ActionButtons'
import MatchCelebrationModal from '@/components/match/MatchCelebrationModal'
import UserHingeProfile from '@/components/match/UserHingeProfile'
import SwipeableTabScreen from '@/components/navigation/SwipeableTabScreen'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { useDiscovery } from '@/hooks/useDiscovery'
import { publicProfilePath } from '@/lib/profileRoutes'
import { useMatches } from '@/hooks/useMatches'
import * as Haptics from 'expo-haptics'

const TAB_BAR_HEIGHT = 80

export default function MatchScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = TAB_BAR_HEIGHT
  const router = useRouter()
  const { isLoaded } = useAuth()
  const { conversations, totalUnread } = useChat()
  const useGlass = isLiquidGlassAvailable()
  const scrollRef = useRef<ScrollView>(null)

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

  const currentUser = filteredUsers[0]

  const handleLike = () => {
    if (!currentUser) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    like(currentUser)
  }

  const handlePass = () => {
    if (!currentUser) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    dismiss('user', currentUser.userId)
  }

  return (
    <SwipeableTabScreen tab="(match)">
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
        >
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">Mutuals</Text>
          <View className="flex-row items-center gap-3">
            {useGlass ? (
              <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center rounded-full"
                  onPress={() => router.push('/(home)/(match)/history')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="time-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
              </GlassView>
            ) : (
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
                onPress={() => router.push('/(home)/(match)/history')}
                activeOpacity={0.75}
              >
                <Ionicons name="time-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
            )}

            {useGlass ? (
              <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
                <TouchableOpacity
                  className="relative h-11 w-11 items-center justify-center rounded-full"
                  onPress={() => router.push('/(home)/(match)/chat')}
                  activeOpacity={0.75}
                >
                  {Platform.OS === 'ios' ? (
                    <SymbolView name="paperplane.fill" size={21} tintColor={Colors.primary} />
                  ) : (
                    <Ionicons name="paper-plane-outline" size={21} color={Colors.primary} />
                  )}
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
              </GlassView>
            ) : (
              <TouchableOpacity
                className="relative h-11 w-11 items-center justify-center rounded-full bg-surface-container"
                onPress={() => router.push('/(home)/(match)/chat')}
                activeOpacity={0.75}
              >
                {Platform.OS === 'ios' ? (
                  <SymbolView name="paperplane.fill" size={21} tintColor={Colors.primary} />
                ) : (
                  <Ionicons name="paper-plane-outline" size={21} color={Colors.primary} />
                )}
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
            )}
          </View>
        </View>

        {/* Content area */}
        {usersLoading ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="text-on-surface-variant font-medium">Finding mutuals...</Text>
          </View>
        ) : !currentUser ? (
          <View className="flex-1 items-center justify-center gap-3 px-10">
            {Platform.OS === 'ios' ? (
              <SymbolView name="person.3.fill" size={52} tintColor={Colors.onSurfaceVariant} />
            ) : (
              <Ionicons name="people-outline" size={52} color={Colors.onSurfaceVariant} />
            )}
            <Text className="text-on-surface-variant text-base font-medium text-center">
              No one new to show right now
            </Text>
            {useGlass ? (
              <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => loadUsers(true)}
                  className="h-11 items-center justify-center rounded-full px-6"
                  activeOpacity={0.75}
                >
                  <Text className="font-bold" style={{ color: Colors.primary }}>Refresh</Text>
                </TouchableOpacity>
              </GlassView>
            ) : (
              <TouchableOpacity
                onPress={() => loadUsers(true)}
                className="mt-2 rounded-full bg-primary px-6 py-3"
              >
                <Text className="font-bold text-on-primary">Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <UserHingeProfile
            key={currentUser.userId}
            user={currentUser}
            scrollRef={scrollRef}
            onViewProfile={() => router.push(publicProfilePath(currentUser.userId, '(match)') as any)}
            bottomPadding={tabBarHeight + 120}
          />
        )}

        {/* Action buttons — floating above tab bar */}
        {!usersLoading && !!currentUser && (
          <View
            pointerEvents="box-none"
            className="absolute left-0 right-0 items-center"
            style={{ bottom: tabBarHeight + 20 }}
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
