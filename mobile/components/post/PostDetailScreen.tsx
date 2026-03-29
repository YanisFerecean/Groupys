import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useUser } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { MarkdownDisplay } from '@/components/ui/MarkdownDisplay'
import { router, useSegments } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiDelete, apiFetch, apiPost, mediaUrl } from '@/lib/api'
import { communityDetailPath, publicProfilePath, resolveHomeTab } from '@/lib/profileRoutes'
import { timeAgo } from '@/lib/timeAgo'
import { Colors } from '@/constants/colors'
import AuthImageWithToken from '@/components/ui/AuthImageWithToken'
import VideoThumbnail from '@/components/ui/VideoThumbnail'
import { useAuthToken } from '@/hooks/useAuthToken'
import CommentItem from '@/components/post/CommentItem'
import type { PostResDto } from '@/models/PostRes'
import type { CommentResDto } from '@/models/CommentRes'
import type { CommunityResDto } from '@/models/CommunityRes'
import MediaLightbox from '@/components/ui/MediaLightbox'

const HERO_COLORS = [
  '#7c3aed', '#be185d', '#0891b2', '#b45309', '#059669', '#6366f1',
  '#dc2626', '#2563eb', '#7c2d12', '#4f46e5',
]

function heroColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return HERO_COLORS[Math.abs(hash) % HERO_COLORS.length]
}

function updateCommentInTree(tree: CommentResDto[], updated: CommentResDto): CommentResDto[] {
  return tree.map((c) => {
    if (c.id === updated.id) return updated
    if (c.replies?.length) return { ...c, replies: updateCommentInTree(c.replies, updated) }
    return c
  })
}

function removeCommentFromTree(tree: CommentResDto[], commentId: string): CommentResDto[] {
  return tree
    .filter((c) => c.id !== commentId)
    .map((c) => {
      if (c.replies?.length) return { ...c, replies: removeCommentFromTree(c.replies, commentId) }
      return c
    })
}

interface Props {
  postId: string
}

export default function PostDetailScreen({ postId }: Props) {
  const insets = useSafeAreaInsets()
  const segments = useSegments()
  const currentTab = resolveHomeTab(segments)
  const { user } = useUser()
  const { refreshToken } = useAuthToken()

  const commentInputRef = useRef<TextInput>(null)
  const [post, setPost] = useState<PostResDto | null>(null)
  const [community, setCommunity] = useState<CommunityResDto | null>(null)
  const [comments, setComments] = useState<CommentResDto[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [initialIndex, setInitialIndex] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    const token = await refreshToken()
    if (!token) return
    try {
      const [postData, commentsData] = await Promise.all([
        apiFetch<PostResDto>(`/posts/${postId}`, token),
        apiFetch<CommentResDto[]>(`/comments/post/${postId}`, token),
      ])
      const communityData = await apiFetch<CommunityResDto>(`/communities/${postData.communityId}`, token)
      setPost(postData)
      setCommunity(communityData)
      setComments(commentsData)
    } catch (err) {
      console.error('Failed to fetch post:', err)
    } finally {
      setLoading(false)
    }
  }, [postId, refreshToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleReact = useCallback(
    async (type: 'like' | 'dislike') => {
      void Haptics.impactAsync(
        type === 'like'
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium,
      )
      try {
        const token = await refreshToken()
        if (!token) return
        const updated = await apiPost<PostResDto>(`/posts/${postId}/react`, token, { type })
        setPost(updated)
      } catch (err) {
        console.error('React error:', err)
      }
    },
    [postId, refreshToken],
  )

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const token = await refreshToken()
      if (!token) return
      await apiPost<CommentResDto>(
        `/comments/post/${postId}`,
        token,
        {
          content: commentText.trim(),
          parentCommentId: replyTo?.id ?? null,
        },
      )
      const updatedComments = await apiFetch<CommentResDto[]>(`/comments/post/${postId}`, token)
      setComments(updatedComments)
      setCommentText('')
      setReplyTo(null)
    } catch (err) {
      console.error('Comment error:', err)
    } finally {
      setSubmitting(false)
    }
  }, [postId, commentText, replyTo, submitting, refreshToken])

  const handleDelete = async () => {
    if (deleting) return
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            const token = await refreshToken()
            if (!token) return
            await apiDelete(`/posts/${postId}`, token)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
          } catch (err) {
            console.error('Delete error:', err)
            Alert.alert('Error', 'Failed to delete post')
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }

  const handleCommentUpdated = useCallback((updated: CommentResDto) => {
    setComments((prev) => updateCommentInTree(prev, updated))
  }, [])

  const handleCommentDeleted = useCallback((commentId: string) => {
    setComments((prev) => removeCommentFromTree(prev, commentId))
  }, [])

  const handleVisitAuthor = useCallback(() => {
    if (!post) return
    router.push(publicProfilePath(post.authorId, currentTab) as any)
  }, [currentTab, post])

  const hasMedia = post?.media && post.media.length > 0
  const isAuthor = user && post && user.id === post.authorClerkId
  const communityColor = community ? heroColor(community.id) : '#4f46e5'

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!post) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-10">
        <Ionicons name="alert-circle-outline" size={40} color={Colors.primary} />
        <Text className="text-on-surface font-bold text-lg mt-3">Post not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary font-semibold">Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute z-10 left-5 h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30"
        style={{ top: insets.top + 8 }}
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {post ? (
          <View className="mb-5">
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => router.push(communityDetailPath(post.communityId, currentTab) as never)}
            >
              <View
                style={{ backgroundColor: communityColor, height: 280, paddingTop: insets.top + 56 }}
                className="justify-end"
              >
                {community?.bannerUrl ? (
                  <AuthImageWithToken
                    uri={mediaUrl(community.bannerUrl.replace(/^\/api\/posts\/media\//, ''))}
                    className="absolute"
                    style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
                  />
                ) : null}
                <View className="absolute inset-0 bg-black/35" />

                <View className="px-5 pb-5 flex-row items-end gap-3">
                  {community?.iconType === 'EMOJI' && community.iconEmoji ? (
                    <View className="mb-1 h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                      <Text className="text-3xl">{community.iconEmoji}</Text>
                    </View>
                  ) : community?.iconUrl ? (
                    <AuthImageWithToken
                      uri={mediaUrl(community.iconUrl.replace(/^\/api\/posts\/media\//, ''))}
                      style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 4 }}
                    />
                  ) : (
                    <View className="mb-1 h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                      <Ionicons name="people" size={26} color="#fff" />
                    </View>
                  )}

                  <View className="flex-1">
                    <Text className="text-3xl font-extrabold tracking-tight text-white" numberOfLines={2}>
                      {community?.name ?? post.communityName}
                    </Text>
                    {community?.description ? (
                      <Text className="mt-1 text-sm text-white/80" numberOfLines={2}>
                        {community.description}
                      </Text>
                    ) : (
                      <Text className="mt-1 text-sm text-white/80" numberOfLines={1}>
                        Open community
                      </Text>
                    )}

                    <View className="mt-3 flex-row flex-wrap items-center gap-4">
                      {community ? (
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="people" size={14} color="rgba(255,255,255,0.82)" />
                          <Text className="text-xs font-semibold text-white/80">
                            {community.memberCount} members
                          </Text>
                        </View>
                      ) : null}
                      {community?.genre ? (
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="musical-notes" size={14} color="rgba(255,255,255,0.82)" />
                          <Text className="text-xs font-semibold text-white/80">{community.genre}</Text>
                        </View>
                      ) : null}
                      {community?.country ? (
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.82)" />
                          <Text className="text-xs font-semibold text-white/80">{community.country}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {community?.tags?.length ? (
              <View className="flex-row flex-wrap gap-2 px-5 pb-2 pt-4">
                {community.tags.slice(0, 4).map((tag) => (
                  <View key={tag} className="rounded-full bg-surface-container-high px-3 py-1">
                    <Text className="text-xs font-semibold text-on-surface-variant">{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Post content */}
        <View className="px-5">
          {/* Author */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              className="flex-row items-center gap-3"
              onPress={handleVisitAuthor}
            >
              {post.authorProfileImage ? (
                <Image
                  source={{ uri: post.authorProfileImage }}
                  className="w-10 h-10 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-10 h-10 rounded-full bg-surface-container-high items-center justify-center">
                  <Ionicons name="person" size={18} color="#999" />
                </View>
              )}
              <View>
                <Text className="text-base font-semibold text-on-surface">
                  {post.authorDisplayName || post.authorUsername}
                </Text>
                <Text className="text-xs text-on-surface-variant">{timeAgo(post.createdAt)}</Text>
              </View>
            </TouchableOpacity>

            {isAuthor && (
              <TouchableOpacity onPress={handleDelete} disabled={deleting} className="p-2">
                {deleting ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Full content */}
          {post.content ? (
            <View className="mb-4">
              <MarkdownDisplay
                content={post.content}
                baseFontSize={16}
                color={Colors.onSurface}
                interactive
              />
            </View>
          ) : null}

          {/* Media */}
          {hasMedia ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ gap: 8 }}
            >
              {post.media.map((m, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => setInitialIndex(i)}
                  style={{ width: post.media.length > 1 ? 280 : '100%', minWidth: post.media.length === 1 ? '100%' : undefined }}
                >
                  {m.type.startsWith('image/') ? (
                    <AuthImageWithToken
                      uri={mediaUrl(m.url.replace(/^\/api\/posts\/media\//, ''))}
                      style={{ height: 240 }}
                    />
                  ) : m.type.startsWith('video/') ? (
                    <VideoThumbnail
                      url={mediaUrl(m.url.replace(/^\/api\/posts\/media\//, ''))}
                      width="100%"
                      height={240}
                    />
                  ) : (
                    <View className="bg-surface-container-high rounded-xl items-center justify-center overflow-hidden" style={{ height: 240, width: '100%' }}>
                      <Ionicons name="musical-notes" size={48} color={Colors.onSurfaceVariant} />
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

          {/* Reactions */}
          <View className="flex-row items-center gap-1 py-3 border-t border-b border-surface-container-high/50 mb-4">
            <TouchableOpacity
              onPress={() => handleReact('like')}
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full ${
                post.userReaction === 'like' ? 'bg-primary/15' : ''
              }`}
              activeOpacity={0.7}
            >
              <Ionicons
                name={post.userReaction === 'like' ? 'heart' : 'heart-outline'}
                size={18}
                color={post.userReaction === 'like' ? Colors.primary : Colors.onSurfaceVariant}
              />
              {post.likeCount > 0 ? (
                <Text className={`text-sm font-semibold ${post.userReaction === 'like' ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {post.likeCount}
                </Text>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleReact('dislike')}
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full ${
                post.userReaction === 'dislike' ? 'bg-secondary/15' : ''
              }`}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={post.userReaction === 'dislike' ? 'heart-broken' : 'heart-broken-outline'}
                size={18}
                color={post.userReaction === 'dislike' ? Colors.secondary : Colors.onSurfaceVariant}
              />
              {post.dislikeCount > 0 ? (
                <Text className={`text-sm font-semibold ${post.userReaction === 'dislike' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {post.dislikeCount}
                </Text>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => commentInputRef.current?.focus()}
              className="flex-row items-center gap-1.5 px-4 py-2 ml-auto"
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={18} color={Colors.onSurfaceVariant} />
              <Text className="text-sm font-semibold text-on-surface-variant">
                {post.commentCount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Comments */}
          <Text className="text-on-surface font-bold text-base mb-3">Comments</Text>
          {comments.length === 0 ? (
            <Text className="text-on-surface-variant text-sm py-4">No comments yet. Be the first!</Text>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={(id, username) => setReplyTo({ id, username })}
                onCommentUpdated={handleCommentUpdated}
                onCommentDeleted={handleCommentDeleted}
                currentUsername={user?.username ?? undefined}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Comment input */}
      <View
        className="border-t border-surface-container-high bg-surface px-5 py-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {replyTo ? (
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs text-on-surface-variant">
              Replying to <Text className="font-semibold">@{replyTo.username}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View className="flex-row items-center gap-2">
          <TextInput
            ref={commentInputRef}
            className="flex-1 bg-surface-container-low rounded-full px-4 py-2.5 text-sm text-on-surface"
            placeholder="Add a comment..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={commentText}
            onChangeText={setCommentText}
            multiline={false}
          />
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
            className={`w-9 h-9 rounded-full items-center justify-center ${
              commentText.trim() ? 'bg-primary' : 'bg-surface-container-high'
            }`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="send"
                size={16}
                color={commentText.trim() ? '#fff' : '#999'}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
