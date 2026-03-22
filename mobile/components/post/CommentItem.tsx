import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useCallback, useState } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { apiPost } from '@/lib/api'
import { timeAgo } from '@/lib/timeAgo'
import { Colors } from '@/constants/colors'
import type { CommentResDto } from '@/models/CommentRes'

interface CommentItemProps {
  comment: CommentResDto
  depth?: number
  onReply?: (commentId: string) => void
  onCommentUpdated?: (updated: CommentResDto) => void
}

const MAX_DEPTH = 2

export default function CommentItem({
  comment,
  depth = 0,
  onReply,
  onCommentUpdated,
}: CommentItemProps) {
  const { getToken } = useAuth()
  const [reacting, setReacting] = useState(false)

  const handleReact = useCallback(
    async (type: 'like' | 'dislike') => {
      if (reacting) return
      setReacting(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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

  return (
    <View style={{ marginLeft: depth * 16 }} className="mb-3">
      <View className="flex-row gap-2.5">
        {/* Avatar */}
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

        <View className="flex-1">
          {/* Author + time */}
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-on-surface">
              {comment.authorDisplayName || comment.authorUsername}
            </Text>
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
                name={comment.userReaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
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
                name={comment.userReaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
                size={14}
                color={comment.userReaction === 'dislike' ? Colors.secondary : Colors.onSurfaceVariant}
              />
              {comment.dislikeCount > 0 ? (
                <Text className="text-xs text-on-surface-variant">{comment.dislikeCount}</Text>
              ) : null}
            </TouchableOpacity>

            {depth < MAX_DEPTH ? (
              <TouchableOpacity
                onPress={() => onReply?.(comment.id)}
                activeOpacity={0.7}
              >
                <Text className="text-xs font-semibold text-primary">Reply</Text>
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
        />
      ))}
    </View>
  )
}
