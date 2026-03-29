import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { apiDelete, apiPost } from '@/lib/api'
import { publicProfilePath, resolveHomeTab } from '@/lib/profileRoutes'
import { timeAgo } from '@/lib/timeAgo'
import { Colors } from '@/constants/colors'
import type { CommentResDto } from '@/models/CommentRes'
import { router, useSegments } from 'expo-router'

interface CommentItemProps {
  comment: CommentResDto
  depth?: number
  onReply?: (commentId: string, username: string) => void
  onCommentUpdated?: (updated: CommentResDto) => void
  onCommentDeleted?: (commentId: string) => void
  currentUsername?: string
}

const MAX_REPLY_DEPTH = 0

export default function CommentItem({
  comment,
  depth = 0,
  onReply,
  onCommentUpdated,
  onCommentDeleted,
  currentUsername,
}: CommentItemProps) {
  const segments = useSegments()
  const currentTab = resolveHomeTab(segments)
  const { getToken } = useAuth()
  const [reacting, setReacting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleReact = useCallback(
    async (type: 'like' | 'dislike') => {
      if (reacting) return
      setReacting(true)
      void Haptics.impactAsync(
        type === 'like'
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium,
      )
      try {
        const token = await getToken()
        const updated = await apiPost<CommentResDto>(
          `/comments/${comment.id}/react`,
          token,
          { type },
        )
        onCommentUpdated?.(updated)
      } catch (err) {
        console.error('Comment react error:', err)
      } finally {
        setReacting(false)
      }
    },
    [comment.id, reacting, getToken, onCommentUpdated],
  )

  const handleDelete = useCallback(async () => {
    if (deleting) return
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          try {
            const token = await getToken()
            await apiDelete(`/comments/${comment.id}`, token)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            onCommentDeleted?.(comment.id)
          } catch (err) {
            console.error('Comment delete error:', err)
            Alert.alert('Error', 'Failed to delete comment')
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }, [comment.id, deleting, getToken, onCommentDeleted])

  const handleVisitProfile = useCallback(() => {
    router.push(publicProfilePath(comment.authorId, currentTab) as any)
  }, [comment.authorId, currentTab])

  return (
    <View style={{ marginLeft: depth * 16 }} className="mb-3">
      <View className="flex-row gap-2.5">
        {/* Avatar */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleVisitProfile}>
          {comment.authorProfileImage ? (
            <Image
              source={{ uri: comment.authorProfileImage }}
              className="w-8 h-8 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-surface-container-high items-center justify-center">
              <Ionicons name="person" size={14} color="#999" />
            </View>
          )}
        </TouchableOpacity>

        <View className="flex-1">
          {/* Author + time */}
          <View className="flex-row items-center gap-2">
            <TouchableOpacity activeOpacity={0.8} onPress={handleVisitProfile}>
              <Text className="text-sm font-semibold text-on-surface">
                {comment.authorDisplayName || comment.authorUsername}
              </Text>
            </TouchableOpacity>
            <Text className="text-xs text-on-surface-variant">
              {timeAgo(comment.createdAt)}
            </Text>
          </View>

          {/* Content */}
          <Text className="text-sm text-on-surface leading-5 mt-0.5">
            {comment.content}
          </Text>

          {/* Actions */}
          <View className="flex-row items-center gap-3 mt-1.5">
            <TouchableOpacity
              onPress={() => handleReact('like')}
              className="flex-row items-center gap-1"
              activeOpacity={0.7}
            >
              <Ionicons
                name={comment.userReaction === 'like' ? 'heart' : 'heart-outline'}
                size={14}
                color={comment.userReaction === 'like' ? Colors.primary : Colors.onSurfaceVariant}
              />
              {comment.likeCount > 0 ? (
                <Text className="text-xs text-on-surface-variant">{comment.likeCount}</Text>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleReact('dislike')}
              className="flex-row items-center gap-1"
              activeOpacity={0.7}
            >
              <Ionicons
                name={comment.userReaction === 'dislike' ? 'heart-dislike' : 'heart-dislike-outline'}
                size={14}
                color={comment.userReaction === 'dislike' ? Colors.secondary : Colors.onSurfaceVariant}
              />
              {comment.dislikeCount > 0 ? (
                <Text className="text-xs text-on-surface-variant">{comment.dislikeCount}</Text>
              ) : null}
            </TouchableOpacity>

            {depth <= MAX_REPLY_DEPTH ? (
              <TouchableOpacity
                onPress={() => onReply?.(comment.id, comment.authorUsername)}
                activeOpacity={0.7}
              >
                <Text className="text-xs font-semibold text-primary">Reply</Text>
              </TouchableOpacity>
            ) : null}

            {comment.authorUsername === currentUsername ? (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.7}
                className="ml-auto"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Ionicons name="trash-outline" size={14} color="#dc2626" />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Nested replies */}
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          onReply={onReply}
          onCommentUpdated={onCommentUpdated}
          onCommentDeleted={onCommentDeleted}
          currentUsername={currentUsername}
        />
      ))}
    </View>
  )
}
