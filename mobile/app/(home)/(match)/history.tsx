import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MatchHistoryListItem } from '@/components/match/MatchHistoryListItem'
import { SentLikeListItem } from '@/components/match/SentLikeListItem'
import { Colors } from '@/constants/colors'
import { fetchMatchHistory, fetchSentLikes, withdrawLike } from '@/lib/match-api'
import type { SentLike, UserMatch } from '@/models/Match'

const PAGE_SIZE = 20

type HistoryTab = 'matches' | 'likes'

function mergeUniqueBy<T>(
  previous: T[],
  incoming: T[],
  getKey: (item: T) => string,
  reset: boolean,
) {
  const merged = reset ? [...incoming] : [...previous, ...incoming]
  const seen = new Set<string>()

  return merged.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export default function MatchHistoryScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [activeTab, setActiveTab] = useState<HistoryTab>('matches')

  const [matches, setMatches] = useState<UserMatch[]>([])
  const [matchesPage, setMatchesPage] = useState(0)
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [matchesLoadingMore, setMatchesLoadingMore] = useState(false)
  const [matchesHasMore, setMatchesHasMore] = useState(true)
  const [matchesInitialized, setMatchesInitialized] = useState(false)

  const [likes, setLikes] = useState<SentLike[]>([])
  const [likesPage, setLikesPage] = useState(0)
  const [likesLoading, setLikesLoading] = useState(false)
  const [likesLoadingMore, setLikesLoadingMore] = useState(false)
  const [likesHasMore, setLikesHasMore] = useState(true)
  const [likesInitialized, setLikesInitialized] = useState(false)
  const [withdrawingTargetUserId, setWithdrawingTargetUserId] = useState<string | null>(null)

  getTokenRef.current = getToken

  const loadMatches = useCallback(async (reset = false) => {
    const nextPage = reset ? 0 : matchesPage
    if (reset) {
      setMatchesLoading(true)
    } else {
      if (matchesLoadingMore || !matchesHasMore) {
        return
      }
      setMatchesLoadingMore(true)
    }

    try {
      const token = await getTokenRef.current()
      const data = await fetchMatchHistory(token, nextPage, PAGE_SIZE)
      setMatches((prev) => mergeUniqueBy(prev, data, (match) => match.matchId, reset))
      setMatchesPage(nextPage + 1)
      setMatchesHasMore(data.length === PAGE_SIZE)
    } catch (error) {
      console.error('[match-history] failed to load matches', error)
    } finally {
      setMatchesInitialized(true)
      setMatchesLoading(false)
      setMatchesLoadingMore(false)
    }
  }, [matchesHasMore, matchesLoadingMore, matchesPage])

  const loadLikes = useCallback(async (reset = false) => {
    const nextPage = reset ? 0 : likesPage
    if (reset) {
      setLikesLoading(true)
    } else {
      if (likesLoadingMore || !likesHasMore) {
        return
      }
      setLikesLoadingMore(true)
    }

    try {
      const token = await getTokenRef.current()
      const data = await fetchSentLikes(token, nextPage, PAGE_SIZE)
      setLikes((prev) => mergeUniqueBy(prev, data, (like) => like.targetUserId, reset))
      setLikesPage(nextPage + 1)
      setLikesHasMore(data.length === PAGE_SIZE)
    } catch (error) {
      console.error('[match-history] failed to load sent likes', error)
    } finally {
      setLikesInitialized(true)
      setLikesLoading(false)
      setLikesLoadingMore(false)
    }
  }, [likesHasMore, likesLoadingMore, likesPage])

  useEffect(() => {
    if (!matchesInitialized) {
      void loadMatches(true)
    }
  }, [loadMatches, matchesInitialized])

  useEffect(() => {
    if (activeTab === 'likes' && !likesInitialized) {
      void loadLikes(true)
    }
  }, [activeTab, likesInitialized, loadLikes])

  const refreshing = activeTab === 'matches' ? matchesLoading : likesLoading
  const loadingMore = activeTab === 'matches' ? matchesLoadingMore : likesLoadingMore
  const hasMore = activeTab === 'matches' ? matchesHasMore : likesHasMore

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
        <TouchableOpacity
          className="mb-5 flex-row items-center self-start rounded-full bg-surface-container px-3 py-2"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={18} color={Colors.onSurface} />
          <Text className="ml-1 text-sm font-semibold text-on-surface">Back</Text>
        </TouchableOpacity>

        <Text className="text-4xl font-extrabold tracking-tighter text-primary">
          Connections
        </Text>
        <Text className="mt-2 text-[15px] font-medium text-on-surface-variant">
          Browse past matches and manage likes you sent before they turned into a match.
        </Text>
      </View>

      <View className="flex-row gap-3 px-5 pb-4">
        <Pressable
          onPress={() => setActiveTab('matches')}
          className={`flex-1 rounded-full px-4 py-3 ${activeTab === 'matches' ? 'bg-primary' : 'bg-surface-container'}`}
        >
          <Text className={`text-center text-sm font-bold uppercase tracking-wide ${activeTab === 'matches' ? 'text-on-primary' : 'text-on-surface'}`}>
            Match History
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('likes')}
          className={`flex-1 rounded-full px-4 py-3 ${activeTab === 'likes' ? 'bg-primary' : 'bg-surface-container'}`}
        >
          <Text className={`text-center text-sm font-bold uppercase tracking-wide ${activeTab === 'likes' ? 'text-on-primary' : 'text-on-surface'}`}>
            Sent Likes
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={activeTab === 'matches' ? matches : likes}
        key={activeTab}
        keyExtractor={(item, index) => activeTab === 'matches'
          ? `${(item as UserMatch).matchId}:${(item as UserMatch).matchedAt}:${index}`
          : `${(item as SentLike).targetUserId}:${(item as SentLike).likedAt}:${index}`}
        renderItem={({ item }) => activeTab === 'matches' ? (
          <MatchHistoryListItem match={item as UserMatch} />
        ) : (
          <SentLikeListItem
            like={item as SentLike}
            busy={withdrawingTargetUserId === (item as SentLike).targetUserId}
            onWithdraw={() => {
              const targetUserId = (item as SentLike).targetUserId
              setWithdrawingTargetUserId(targetUserId)
              void (async () => {
                try {
                  const token = await getTokenRef.current()
                  await withdrawLike(targetUserId, token)
                  setLikes((prev) => prev.filter((like) => like.targetUserId !== targetUserId))
                } catch (error) {
                  console.error('[match-history] failed to withdraw like', error)
                } finally {
                  setWithdrawingTargetUserId((current) => current === targetUserId ? null : current)
                }
              })()
            }}
          />
        )}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 36,
        }}
        ListEmptyComponent={(
          <View className="flex-1 items-center justify-center px-10">
            {refreshing ? (
              <ActivityIndicator color={Colors.primary} />
            ) : activeTab === 'matches' ? (
              <>
                <Ionicons name="heart-outline" size={42} color={Colors.onSurfaceVariant} />
                <Text className="mt-4 text-lg font-bold text-on-surface">No match history yet</Text>
                <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                  When you match with someone, they will appear here even if the connection ends later.
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={42} color={Colors.onSurfaceVariant} />
                <Text className="mt-4 text-lg font-bold text-on-surface">No sent likes waiting</Text>
                <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                  Likes that have not turned into a match yet will show up here, and you can remove them.
                </Text>
              </>
            )}
          </View>
        )}
        ListFooterComponent={loadingMore ? (
          <View className="py-4">
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : null}
        onEndReached={() => {
          if (!hasMore || loadingMore) {
            return
          }

          if (activeTab === 'matches') {
            void loadMatches(false)
          } else {
            void loadLikes(false)
          }
        }}
        onEndReachedThreshold={0.35}
        onRefresh={() => {
          if (activeTab === 'matches') {
            void loadMatches(true)
          } else {
            void loadLikes(true)
          }
        }}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}
