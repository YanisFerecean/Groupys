import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
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

interface FeedPostCardProps {
  post: PostResDto
  onPostUpdated?: (updated: PostResDto) => void
  communityRoute?: string
  postRoute?: string
}

function getPostExcerpt(content: string, maxLength: number) {
  const plainText = content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, ' $1 ')
    .replace(/<\/?u>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~]/g, '')
    .replace(/^\s*[-+]\s+/gm, ' ')
    .replace(/^\s*\d+\.\s+/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (plainText.length <= maxLength) {
    return plainText
  }

  return `${plainText.slice(0, maxLength).trimEnd()}...`
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
  const authorName = post.authorDisplayName || post.authorUsername
  const excerpt = post.content
    ? getPostExcerpt(post.content, post.title ? 120 : 160)
    : ''

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
    <View className="mb-3 overflow-hidden rounded-[28px] bg-surface-container-lowest shadow-sm shadow-on-surface-variant/5">
      <TouchableOpacity
        onPress={navigateToPost}
        activeOpacity={0.9}
        className="px-4 pb-4 pt-4"
      >
        <View className="flex-row items-center justify-between pb-3">
          <View className="flex-1 flex-row items-center gap-2.5">
            {post.authorProfileImage ? (
              <Image
                source={{ uri: post.authorProfileImage }}
                className="h-9 w-9 rounded-full ring-2 ring-surface-container-low"
                resizeMode="cover"
              />
            ) : (
              <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-container-high">
                <Ionicons name="person" size={16} color={Colors.onSurfaceVariant} />
              </View>
            )}

            <View className="flex-1">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-[14px] font-bold tracking-tight text-on-surface" numberOfLines={1}>
                  {authorName}
                </Text>
                <Text className="mx-1.5 text-[14px] text-on-surface-variant/40">in</Text>
                <TouchableOpacity
                  onPress={navigateToCommunity}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text className="text-[14px] font-semibold text-primary" numberOfLines={1}>
                    {post.communityName}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text className="text-[11px] font-medium tracking-wide text-on-surface-variant/60 uppercase">
                {timeAgo(post.createdAt)}
              </Text>
            </View>
          </View>

          <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest active:bg-surface-container-low">
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {(post.title || excerpt) ? (
          <View className="pb-3 px-0.5">
            {post.title ? (
              <Text className="text-[17px] font-bold leading-6 tracking-tight text-on-surface" numberOfLines={2}>
                {post.title}
              </Text>
            ) : null}

            {excerpt ? (
              <Text
                className={`text-[15px] leading-snug tracking-normal ${
                  post.title ? 'mt-2 text-on-surface-variant/80' : 'text-on-surface'
                }`}
                numberOfLines={post.title ? 2 : 4}
              >
                {excerpt}
              </Text>
            ) : null}
          </View>
        ) : null}

        {post.media && post.media.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-1"
            contentContainerStyle={{ gap: 12, paddingRight: 4 }}
          >
            {post.media.map((m, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setInitialIndex(i)}
                activeOpacity={0.9}
                style={{
                  width: post.media.length > 1 ? 280 : '100%',
                  aspectRatio: 16 / 10,
                }}
              >
                {m.type.startsWith('image/') ? (
                  <AuthImageWithToken
                    uri={mediaUrl(m.url.replace(/^\/api\/posts\/media\//, ''))}
                    className="h-full w-full rounded-[24px]"
                  />
                ) : m.type.startsWith('video/') ? (
                  <VideoThumbnail
                    url={mediaUrl(m.url.replace(/^\/api\/posts\/media\//, ''))}
                    width="100%"
                    height="100%"
                  />
                ) : (
                  <View
                    className="h-full w-full items-center justify-center overflow-hidden rounded-[24px] bg-surface-container-high"
                  >
                    <Ionicons name="musical-notes" size={32} color={Colors.onSurfaceVariant} />
                    <Text className="mt-2 text-xs font-medium text-on-surface-variant/60">Audio File</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View className="mt-4 flex-row items-center gap-3">
          <View className="flex-row overflow-hidden rounded-full bg-surface-container-low/50">
            <TouchableOpacity
              onPress={() => handleReact('like')}
              className={`flex-row items-center gap-2 px-4 py-2 ${
                post.userReaction === 'like' ? 'bg-primary/10' : ''
              }`}
              activeOpacity={0.7}
            >
              <Ionicons
                name={post.userReaction === 'like' ? 'heart' : 'heart-outline'}
                size={18}
                color={post.userReaction === 'like' ? Colors.primary : Colors.onSurfaceVariant}
              />
              {post.likeCount > 0 && (
                <Text
                  className={`text-[13px] font-bold ${
                    post.userReaction === 'like' ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {post.likeCount}
                </Text>
              )}
            </TouchableOpacity>
            
            <View className="w-[1px] bg-on-surface-variant/10 my-2" />
            
            <TouchableOpacity
              onPress={() => handleReact('dislike')}
              className={`flex-row items-center px-4 py-2 ${
                post.userReaction === 'dislike' ? 'bg-secondary/10' : ''
              }`}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={post.userReaction === 'dislike' ? 'heart-broken' : 'heart-broken-outline'}
                size={18}
                color={post.userReaction === 'dislike' ? Colors.secondary : Colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={navigateToPost}
            className="flex-row items-center gap-2 rounded-full bg-surface-container-low/50 px-4 py-2"
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={17} color={Colors.onSurfaceVariant} />
            {post.commentCount > 0 && (
              <Text className="text-[13px] font-bold text-on-surface-variant">
                {post.commentCount}
              </Text>
            )}
          </TouchableOpacity>
          
          <View className="flex-1" />
          
          <TouchableOpacity 
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-container-low/50"
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={17} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

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
    </View>
  )
}
