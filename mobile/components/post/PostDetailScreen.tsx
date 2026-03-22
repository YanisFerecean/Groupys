import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@clerk/expo'
import { useCallback, useEffect, useState } from 'react'
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
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiDelete, apiFetch, apiPost, mediaUrl } from '@/lib/api'
import { timeAgo } from '@/lib/timeAgo'
import { Colors } from '@/constants/colors'
import AuthImageWithToken from '@/components/ui/AuthImageWithToken'
import VideoThumbnail from '@/components/ui/VideoThumbnail'
import { useAuthToken } from '@/hooks/useAuthToken'
import CommentItem from '@/components/post/CommentItem'
import type { PostResDto } from '@/models/PostRes'
import type { CommentResDto } from '@/models/CommentRes'
import MediaLightbox from '@/components/ui/MediaLightbox'

interface Props {
  postId: string
}

export default function PostDetailScreen({ postId }: Props) {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { token } = useAuthToken()

  const [post, setPost] = useState<PostResDto | null>(null)
  const [comments, setComments] = useState<CommentResDto[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [initialIndex, setInitialIndex] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const [postData, commentsData] = await Promise.all([
        apiFetch<PostResDto>(`/posts/${postId}`, token),
        apiFetch<CommentResDto[]>(`/comments/post/${postId}`, token),
      ])
      setPost(postData)
      setComments(commentsData)
    } catch (err) {
      console.error('Failed to fetch post:', err)
    } finally {
      setLoading(false)
    }
  }, [postId, token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleReact = useCallback(
    async (type: 'like' | 'dislike') => {
      if (!token) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      try {
        const updated = await apiPost<PostResDto>(`/posts/${postId}/react`, token, { type })
        setPost(updated)
      } catch (err) {
        console.error('React error:', err)
      }
    },
    [postId, token],
  )

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || submitting || !token) return
    setSubmitting(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await apiPost<CommentResDto>(
        `/comments/post/${postId}`,
        token,
        {
          content: commentText.trim(),
          parentCommentId: replyTo,
        },
      )
      // Refresh comments to get proper nesting
      const updatedComments = await apiFetch<CommentResDto[]>(`/comments/post/${postId}`, token)
      setComments(updatedComments)
      setCommentText('')
      setReplyTo(null)
    } catch (err) {
      console.error('Comment error:', err)
    } finally {
      setSubmitting(false)
    }
  }, [postId, commentText, replyTo, submitting, token])

  const handleDelete = async () => {
    if (!token || deleting) return
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
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

  const hasMedia = post?.media && post.media.length > 0
  const isAuthor = user && post && user.id === post.authorClerkId

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
        className="absolute z-10 left-5 items-center justify-center w-9 h-9 rounded-full bg-surface-container-high"
        style={{ top: insets.top + 8 }}
      >
        <Ionicons name="chevron-back" size={22} color={Colors.onSurface} />
      </TouchableOpacity>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post content */}
        <View className="px-5">
          {/* Community badge */}
          <View className="flex-row items-center gap-1.5 mb-2">
            <Ionicons name="people" size={14} color={Colors.primary} />
            <Text className="text-xs font-semibold text-primary">{post.communityName}</Text>
          </View>

          {/* Author */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
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
            </View>

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
                name={post.userReaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
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
              <Ionicons
                name={post.userReaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
                size={18}
                color={post.userReaction === 'dislike' ? Colors.secondary : Colors.onSurfaceVariant}
              />
              {post.dislikeCount > 0 ? (
                <Text className={`text-sm font-semibold ${post.userReaction === 'dislike' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {post.dislikeCount}
                </Text>
              ) : null}
            </TouchableOpacity>

            <View className="flex-row items-center gap-1.5 px-4 py-2 ml-auto">
              <Ionicons name="chatbubble-outline" size={18} color={Colors.onSurfaceVariant} />
              <Text className="text-sm font-semibold text-on-surface-variant">
                {comments.length}
              </Text>
            </View>
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
                onReply={(id) => setReplyTo(id)}
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
            <Text className="text-xs text-on-surface-variant">Replying to comment</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View className="flex-row items-center gap-2">
          <TextInput
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
