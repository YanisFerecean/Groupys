import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useCallback, useState } from 'react'
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { apiPost, mediaUrl } from '@/lib/api'
import { timeAgo } from '@/lib/timeAgo'
import { Colors } from '@/constants/colors'
import AuthImageWithToken from '@/components/ui/AuthImageWithToken'
import VideoThumbnail from '@/components/ui/VideoThumbnail'
import type { PostResDto } from '@/models/PostRes'
import MediaLightbox from '@/components/ui/MediaLightbox'
import { MarkdownDisplay } from '@/components/ui/MarkdownDisplay'

interface FeedPostCardProps {
  post: PostResDto
  onPostUpdated?: (updated: PostResDto) => void
  communityRoute?: string
  postRoute?: string
}

export default function FeedPostCard({
  post,
  onPostUpdated,
  communityRoute = '/(home)/(discover)/community',
  postRoute = '/(home)/(feed)/post',
}: FeedPostCardProps) {
  const { getToken } = useAuth()
  const [reacting, setReacting] = useState(false)
  const [initialIndex, setInitialIndex] = useState<number | null>(null)

  const handleReact = useCallback(
    async (type: 'like' | 'dislike') => {
      if (reacting) return
      setReacting(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      try {
        const token = await getToken()
        const updated = await apiPost<PostResDto>(
          `/posts/${post.id}/react`,
          token,
          { type },
        )
        onPostUpdated?.(updated)
      } catch (err) {
        console.error('React error:', err)
      } finally {
        setReacting(false)
      }
    },
    [post.id, reacting, getToken, onPostUpdated],
  )

  const navigateToCommunity = () => {
    router.push(`${communityRoute}/${post.communityId}` as any)
  }

  const navigateToPost = () => {
    router.push(`${postRoute}/${post.id}` as any)
  }

  return (
    <View className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm mb-3">
      {/* Community badge */}
      <TouchableOpacity
        className="flex-row items-center gap-1.5 px-4 pt-3 pb-1"
        onPress={navigateToCommunity}
        activeOpacity={0.7}
      >
        <Ionicons name="people" size={14} color={Colors.primary} />
        <Text className="text-xs font-semibold text-primary">
          {post.communityName}
        </Text>
      </TouchableOpacity>

      {/* Author header */}
      <View className="flex-row items-center gap-3 px-4 pt-1 pb-2">
        {post.authorProfileImage ? (
          <Image
            source={{ uri: post.authorProfileImage }}
            className="w-9 h-9 rounded-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-9 h-9 rounded-full bg-surface-container-high items-center justify-center">
            <Ionicons name="person" size={16} color="#999" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-sm font-semibold text-on-surface" numberOfLines={1}>
            {post.authorDisplayName || post.authorUsername}
          </Text>
          <Text className="text-xs text-on-surface-variant">
            {timeAgo(post.createdAt)}
          </Text>
        </View>
      </View>

      {/* Title */}
      {post.title ? (
        <TouchableOpacity
          className="px-4 pb-1"
          onPress={navigateToPost}
          activeOpacity={0.7}
        >
          <Text className="text-base font-bold text-on-surface" numberOfLines={2}>
            {post.title}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Content */}
      {post.content ? (
        <TouchableOpacity
          className="px-4 pb-3"
          onPress={navigateToPost}
          activeOpacity={0.7}
        >
          <View pointerEvents="none">
            <MarkdownDisplay
              content={post.content}
              numberOfLines={3}
              baseFontSize={14}
              color={Colors.onSurfaceVariant}
            />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Media */}
      {post.media && post.media.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 pb-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {post.media.map((m, i) => (
            <TouchableOpacity 
              key={i} 
              onPress={() => setInitialIndex(i)} 
              activeOpacity={0.9}
              style={{ width: post.media.length > 1 ? 280 : '100%', minWidth: post.media.length === 1 ? '100%' : undefined }}
            >
              {m.type.startsWith('image/') ? (
                <AuthImageWithToken uri={mediaUrl(m.url.replace(/^\/api\/posts\/media\//, ''))} />
              ) : m.type.startsWith('video/') ? (
                <VideoThumbnail
                  url={mediaUrl(m.url.replace(/^\/api\/posts\/media\//, ''))}
                  width="100%"
                />
              ) : (
                <View className="bg-surface-container-high rounded-xl items-center justify-center overflow-hidden" style={{ width: '100%', height: 200 }}>
                  <Ionicons name="musical-notes" size={32} color={Colors.onSurfaceVariant} />
                  <Text className="text-on-surface-variant text-xs mt-2">Audio File</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {initialIndex !== null && (
        <MediaLightbox
          visible={initialIndex !== null}
          onClose={() => setInitialIndex(null)}
          allMedia={post.media.map(m => ({
            url: mediaUrl(m.url.replace(/^\/api\/posts\/media\//, '')),
            type: m.type
          }))}
          initialIndex={initialIndex}
        />
      )}

      {/* Reaction bar */}
      <View className="flex-row items-center gap-1 px-3 py-2 border-t border-surface-container-high/50">
        {/* Like */}
        <TouchableOpacity
          onPress={() => handleReact('like')}
          className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${
            post.userReaction === 'like' ? 'bg-primary/15' : ''
          }`}
          activeOpacity={0.7}
        >
          <Ionicons
            name={post.userReaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
            size={16}
            color={post.userReaction === 'like' ? Colors.primary : Colors.onSurfaceVariant}
          />
          {post.likeCount > 0 ? (
            <Text
              className={`text-xs font-semibold ${
                post.userReaction === 'like' ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              {post.likeCount}
            </Text>
          ) : null}
        </TouchableOpacity>

        {/* Dislike */}
        <TouchableOpacity
          onPress={() => handleReact('dislike')}
          className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${
            post.userReaction === 'dislike' ? 'bg-secondary/15' : ''
          }`}
          activeOpacity={0.7}
        >
          <Ionicons
            name={post.userReaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
            size={16}
            color={post.userReaction === 'dislike' ? Colors.secondary : Colors.onSurfaceVariant}
          />
          {post.dislikeCount > 0 ? (
            <Text
              className={`text-xs font-semibold ${
                post.userReaction === 'dislike' ? 'text-secondary' : 'text-on-surface-variant'
              }`}
            >
              {post.dislikeCount}
            </Text>
          ) : null}
        </TouchableOpacity>

        {/* Comments */}
        <TouchableOpacity
          onPress={navigateToPost}
          className="flex-row items-center gap-1 px-3 py-1.5 rounded-full ml-auto"
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={16} color={Colors.onSurfaceVariant} />
          <Text className="text-xs font-semibold text-on-surface-variant">
            {post.commentCount > 0 ? post.commentCount : ''} Comment{post.commentCount !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
