import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@clerk/expo'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiFetch, apiPost } from '@/lib/api'
import { timeAgo, formatCount } from '@/lib/timeAgo'
import { Colors } from '@/constants/colors'
import FeedPostCard from '@/components/feed/FeedPostCard'
import { useAuthToken } from '@/hooks/useAuthToken'
import EditCommunityModal from '@/components/community/EditCommunityModal'
import AuthImageWithToken from '@/components/ui/AuthImageWithToken'
import { mediaUrl } from '@/lib/api'
import type { CommunityResDto } from '@/models/CommunityRes'
import type { CommunityMemberResDto } from '@/models/CommunityMemberRes'
import type { PostResDto } from '@/models/PostRes'

const HERO_COLORS = [
  '#7c3aed', '#be185d', '#0891b2', '#b45309', '#059669', '#6366f1',
  '#dc2626', '#2563eb', '#7c2d12', '#4f46e5',
]

function heroColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return HERO_COLORS[Math.abs(hash) % HERO_COLORS.length]
}

interface Props {
  communityId: string
  postRoute: string
  communityRoute: string
}

export default function CommunityDetailScreen({ communityId, postRoute, communityRoute }: Props) {
  const insets = useSafeAreaInsets()
  const { token } = useAuthToken()
  const { user } = useUser()

  const [community, setCommunity] = useState<CommunityResDto | null>(null)
  const [members, setMembers] = useState<CommunityMemberResDto[]>([])
  const [posts, setPosts] = useState<PostResDto[]>([])
  const [isMember, setIsMember] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!token) return
    try {
      const [communityData, membershipData, membersData, postsData] = await Promise.all([
        apiFetch<CommunityResDto>(`/communities/${communityId}`, token),
        apiFetch<{ member: boolean; owner: boolean }>(`/communities/${communityId}/membership`, token),
        apiFetch<CommunityMemberResDto[]>(`/communities/${communityId}/members`, token),
        apiFetch<PostResDto[]>(`/posts/community/${communityId}`, token),
      ])
      setCommunity(communityData)
      setIsMember(membershipData.member)
      setIsOwner(membershipData.owner)
      setMembers(membersData)
      setPosts(postsData)
    } catch (err) {
      console.error('Failed to fetch community:', err)
    } finally {
      setLoading(false)
    }
  }, [communityId, token])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleJoinLeave = useCallback(async () => {
    if (joining || !token) return
    setJoining(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const endpoint = isMember
        ? `/communities/${communityId}/leave`
        : `/communities/${communityId}/join`
      const updated = await apiPost<CommunityResDto>(endpoint, token, {})
      setCommunity(updated)
      setIsMember(!isMember)
    } catch (err) {
      console.error('Join/leave error:', err)
    } finally {
      setJoining(false)
    }
  }, [communityId, isMember, joining, token])

  const handlePostUpdated = useCallback((updated: PostResDto) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  const handlePostCreated = useCallback((newPost: PostResDto) => {
    setPosts((prev) => [newPost, ...prev])
  }, [])

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!community) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-10">
        <Ionicons name="alert-circle-outline" size={40} color={Colors.primary} />
        <Text className="text-on-surface font-bold text-lg mt-3">Community not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary font-semibold">Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const color = heroColor(community.id)

  return (
    <View className="flex-1 bg-surface">
      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute z-10 left-5 items-center justify-center w-9 h-9 rounded-full bg-black/30"
        style={{ top: insets.top + 8 }}
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>

      {isOwner && (
        <TouchableOpacity
          onPress={() => setShowEditModal(true)}
          className="absolute z-10 right-5 items-center justify-center w-8 h-8 rounded-full bg-black/30"
          style={{ top: insets.top + 8 }}
        >
          <Ionicons name="settings-sharp" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ backgroundColor: color, height: 230 }} className="justify-end relative">
          {community.bannerUrl ? (
            <AuthImageWithToken 
              uri={mediaUrl(community.bannerUrl.replace(/^\/api\/posts\/media\//, ''))} 
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
          ) : null}
          <View className="absolute inset-0 bg-black/40" />
          
          <View className="px-5 pb-5 flex-row items-end gap-3">
            {/* Icon */}
            {community.iconType === 'EMOJI' && community.iconEmoji ? (
              <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mb-1">
                <Text className="text-3xl">{community.iconEmoji}</Text>
              </View>
            ) : community.iconUrl ? (
              <AuthImageWithToken 
                uri={mediaUrl(community.iconUrl.replace(/^\/api\/posts\/media\//, ''))} 
                style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 4 }} 
              />
            ) : null}

            <View className="flex-1">
              <Text className="text-white text-3xl font-extrabold tracking-tight" numberOfLines={2}>
                {community.name}
              </Text>
            {community.description ? (
              <Text className="text-white/80 text-sm mt-1" numberOfLines={2}>
                {community.description}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-4 mt-3">
              <View className="flex-row items-center gap-1">
                <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
                <Text className="text-white/80 text-xs font-semibold">
                  {formatCount(community.memberCount)} members
                </Text>
              </View>
              {community.genre ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="musical-notes" size={14} color="rgba(255,255,255,0.8)" />
                  <Text className="text-white/80 text-xs font-semibold">{community.genre}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        </View>

        {/* Tags + Join */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row flex-wrap gap-2 flex-1 mr-3">
              {community.tags?.map((tag) => (
                <View key={tag} className="bg-surface-container-high px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-on-surface-variant">{tag}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleJoinLeave}
              disabled={joining}
              className={`px-5 py-2 rounded-full ${
                isMember ? 'bg-surface-container-high' : 'bg-primary'
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-bold ${
                  isMember ? 'text-on-surface' : 'text-on-primary'
                }`}
              >
                {joining ? '...' : isMember ? 'Joined' : 'Join'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Members */}
        {members.length > 0 ? (
          <View className="pt-4">
            <View className="px-5">
              <Text className="text-on-surface font-bold text-base mb-3">
                Members ({members.length})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {members.slice(0, 15).map((member) => (
                <View key={member.id} className="items-center" style={{ width: 64 }}>
                  {member.profileImage ? (
                    <Image
                      source={{ uri: member.profileImage }}
                      className="w-12 h-12 rounded-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-full bg-surface-container-high items-center justify-center">
                      <Ionicons name="person" size={20} color="#999" />
                    </View>
                  )}
                  <Text className="text-xs text-on-surface-variant mt-1 text-center" numberOfLines={1}>
                    {member.displayName || member.username}
                  </Text>
                  {member.role === 'owner' ? (
                    <View className="bg-primary/15 px-2 py-0.5 rounded-full mt-0.5">
                      <Text className="text-primary text-[10px] font-bold">OWNER</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Posts */}
        <View className="px-5 pt-6">
          <Text className="text-on-surface font-bold text-base mb-3">
            Posts ({posts.length})
          </Text>
          {posts.length === 0 ? (
            <View className="items-center py-8">
              <Ionicons name="newspaper-outline" size={36} color={Colors.onSurfaceVariant} />
              <Text className="text-on-surface-variant text-sm mt-2">No posts yet</Text>
              {isMember ? (
                <Text className="text-on-surface-variant text-xs mt-1">
                  Be the first to post!
                </Text>
              ) : null}
            </View>
          ) : (
            posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                onPostUpdated={handlePostUpdated}
                communityRoute={communityRoute}
                postRoute={postRoute}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      {showEditModal && (
        <EditCommunityModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          community={community}
          onUpdated={(updated) => setCommunity(updated)}
        />
      )}
    </View>
  )
}
