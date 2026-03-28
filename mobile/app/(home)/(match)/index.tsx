import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@clerk/expo'
import UserRecommendationCard, { type CardHandle } from '@/components/match/UserRecommendationCard'
import ActionButtons from '@/components/match/ActionButtons'
import MatchCelebrationModal from '@/components/match/MatchCelebrationModal'
import MatchListItem from '@/components/match/MatchListItem'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { useDiscovery } from '@/hooks/useDiscovery'
import { useMatches } from '@/hooks/useMatches'

export default function MatchScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { isLoaded } = useAuth()
  const { totalUnread } = useChat()
  const { width } = useWindowDimensions()

  const cardRef = useRef<CardHandle>(null)

  const {
    users,
    usersLoading,
    loadUsers,
    like,
    dismiss,
  } = useDiscovery()

  const { matches, matchesLoading, loadMatches } = useMatches()

  useEffect(() => {
    if (!isLoaded) return
    loadUsers()
    loadMatches()
  }, [isLoaded, loadUsers, loadMatches])

  // Card dimensions: full width minus horizontal padding, 3:4 aspect ratio
  const CARD_WIDTH = width - 40
  const CARD_HEIGHT = (CARD_WIDTH * 4) / 3

  const handleLike = () => {
    if (users.length === 0) return
    cardRef.current?.swipeRight()
  }

  const handlePass = () => {
    if (users.length === 0) return
    cardRef.current?.swipeLeft()
  }

  const visibleUsers = users.slice(0, 3)

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Text className="text-4xl font-extrabold tracking-tighter text-primary">People</Text>
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

      <Text className="px-5 pt-2 pb-4 text-[15px] text-on-surface-variant font-medium">
        People with your taste in music.
      </Text>

      {/* Card stack area */}
      <View className="flex-1 items-center justify-center px-5">
        {usersLoading ? (
          <View className="items-center gap-3">
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="text-on-surface-variant font-medium">Finding people...</Text>
          </View>
        ) : users.length === 0 ? (
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
                />
              )
            })}
          </View>
        )}
      </View>

      {/* Action buttons */}
      {!usersLoading && users.length > 0 && (
        <View
          className="items-center pb-6 pt-4"
          style={{ paddingBottom: insets.bottom + 90 }}
        >
          <ActionButtons
            onPass={handlePass}
            onLike={handleLike}
          />
        </View>
      )}

      {/* Matches section */}
      {matches.length > 0 && (
        <View
          className="border-t border-outline-variant"
          style={{ paddingBottom: insets.bottom + 80 }}
        >
          <Text className="px-5 pt-4 pb-2 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            Your Matches
          </Text>
          {matchesLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} className="py-3" />
          ) : (
            matches.map((match) => (
              <MatchListItem key={match.matchId} match={match} />
            ))
          )}
        </View>
      )}

      {/* Match celebration modal */}
      <MatchCelebrationModal />
    </View>
  )
}
