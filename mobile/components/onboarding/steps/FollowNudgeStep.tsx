import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { Colors } from '@/constants/colors'
import {
  apiPost,
  fetchSuggestedCommunities,
  fetchSuggestedUsers,
  followUser,
} from '@/lib/api'
import type { SuggestedUser } from '@/models/SuggestedUser'
import type { SuggestedCommunity } from '@/models/SuggestedCommunity'
import OnboardingShell from '../OnboardingShell'

interface FollowNudgeStepProps {
  progress: [number, number]
  finishing: boolean
  onFinish: () => void
}

export default function FollowNudgeStep({ progress, finishing, onFinish }: FollowNudgeStepProps) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<SuggestedUser[]>([])
  const [communities, setCommunities] = useState<SuggestedCommunity[]>([])
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [joined, setJoined] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const [u, c] = await Promise.all([
          fetchSuggestedUsers(token, 5).catch(() => [] as SuggestedUser[]),
          fetchSuggestedCommunities(token, 5).catch(() => [] as SuggestedCommunity[]),
        ])
        if (cancelled) return
        setUsers(u.slice(0, 5))
        setCommunities(c.slice(0, 5))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken])

  const toggleFollow = async (userId: string) => {
    if (followed.has(userId)) return
    setFollowed((prev) => new Set(prev).add(userId))
    try {
      const token = await getToken()
      await followUser(userId, token)
    } catch {
      setFollowed((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const toggleJoin = async (communityId: string) => {
    if (joined.has(communityId)) return
    setJoined((prev) => new Set(prev).add(communityId))
    try {
      const token = await getToken()
      await apiPost(`/communities/${encodeURIComponent(communityId)}/join`, token, {})
    } catch {
      setJoined((prev) => {
        const next = new Set(prev)
        next.delete(communityId)
        return next
      })
    }
  }

  const isEmpty = !loading && users.length === 0 && communities.length === 0

  return (
    <OnboardingShell
      title="Find your people"
      subtitle="Follow a few profiles and communities to fill your feed from day one."
      progress={progress}
      ctaLabel="Enter Groupys"
      onCta={onFinish}
      ctaLoading={finishing}
      onSkip={isEmpty ? undefined : onFinish}
      skipLabel="I'll do this later"
    >
      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : isEmpty ? (
        <View className="items-center py-12">
          <Ionicons name="sparkles-outline" size={40} color={Colors.onSurfaceVariant} />
          <Text className="mt-3 text-center text-lg text-on-surface-variant">
            We&apos;ll have recommendations ready once your profile settles in.
          </Text>
        </View>
      ) : (
        <View className="gap-7">
          {users.length > 0 ? (
            <View>
              <Text className="mb-3 text-xl font-black text-on-surface">People for you</Text>
              <View className="gap-2.5">
                {users.map((u) => {
                  const isFollowed = followed.has(u.userId)
                  return (
                    <View key={u.userId} className="flex-row items-center gap-3 rounded-2xl bg-surface-container p-3">
                      {u.profileImage ? (
                        <Image source={{ uri: u.profileImage }} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="cover" />
                      ) : (
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high">
                          <Ionicons name="person" size={22} color={Colors.onSurfaceVariant} />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-bold text-on-surface" numberOfLines={1}>
                          {u.displayName || u.username}
                        </Text>
                        <Text className="text-sm text-on-surface-variant" numberOfLines={1}>
                          {u.explanation || `@${u.username}`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleFollow(u.userId)}
                        disabled={isFollowed}
                        className={`rounded-full px-4 py-2 ${isFollowed ? 'bg-surface-container-high' : 'bg-primary'}`}
                      >
                        <Text className={`text-sm font-bold ${isFollowed ? 'text-on-surface-variant' : 'text-on-primary'}`}>
                          {isFollowed ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            </View>
          ) : null}

          {communities.length > 0 ? (
            <View>
              <Text className="mb-3 text-xl font-black text-on-surface">Communities to join</Text>
              <View className="gap-2.5">
                {communities.map((c) => {
                  const isJoined = joined.has(c.communityId)
                  return (
                    <View key={c.communityId} className="flex-row items-center gap-3 rounded-2xl bg-surface-container p-3">
                      {c.imageUrl ? (
                        <Image source={{ uri: c.imageUrl }} style={{ width: 48, height: 48, borderRadius: 12 }} contentFit="cover" />
                      ) : (
                        <View className="h-12 w-12 items-center justify-center rounded-xl bg-surface-container-high">
                          <Text className="text-2xl">{c.iconEmoji || '🎵'}</Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-bold text-on-surface" numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text className="text-sm text-on-surface-variant" numberOfLines={1}>
                          {c.memberCount} members
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleJoin(c.communityId)}
                        disabled={isJoined}
                        className={`rounded-full px-4 py-2 ${isJoined ? 'bg-surface-container-high' : 'bg-primary'}`}
                      >
                        <Text className={`text-sm font-bold ${isJoined ? 'text-on-surface-variant' : 'text-on-primary'}`}>
                          {isJoined ? 'Joined' : 'Join'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </OnboardingShell>
  )
}
