import { Ionicons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  type KeyboardEvent as RNKeyboardEvent,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router, useSegments } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { apiDelete, apiFetch, apiPost } from '@/lib/api'
import { lexicalContentToMarkdown } from '@/lib/lexicalContent'
import { publicProfilePath, resolveHomeTab } from '@/lib/profileRoutes'
import { timeAgo } from '@/lib/timeAgo'
import { Colors } from '@/constants/colors'
import { MarkdownDisplay } from '@/components/ui/MarkdownDisplay'
import { useAuthToken } from '@/hooks/useAuthToken'
import type { PostResDto } from '@/models/PostRes'
import type { CommentResDto } from '@/models/CommentRes'

const COMMENTS_BATCH_SIZE = 12
const SHEET_BG = '#0e0e10'
const LIKE_RED = '#e5183b'

function updateCommentInTree(tree: CommentResDto[], updated: CommentResDto): CommentResDto[] {
  return tree.map((c) => {
    if (c.id === updated.id) {
      // Preserve the existing nested reply tree because react endpoints may
      // return a partial/stale reply list for the updated comment.
      return { ...c, ...updated, replies: c.replies }
    }
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

/* ---------- Dark, Instagram-style comment row (local to the sheet) ---------- */

interface SheetCommentProps {
  comment: CommentResDto
  isReply?: boolean
  onReply?: (commentId: string, username: string) => void
  onCommentUpdated?: (updated: CommentResDto) => void
  onCommentDeleted?: (commentId: string) => void
  currentUsername?: string
}

function SheetComment({
  comment,
  isReply = false,
  onReply,
  onCommentUpdated,
  onCommentDeleted,
  currentUsername,
}: SheetCommentProps) {
  const segments = useSegments()
  const currentTab = resolveHomeTab(segments)
  const { getToken } = useAuth()
  const [reacting, setReacting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const replyCount = comment.replies?.length ?? 0

  const handleReact = useCallback(
    async (type: 'like' | 'dislike') => {
      if (reacting) return
      setReacting(true)
      void Haptics.impactAsync(
        type === 'like' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
      )
      try {
        const token = await getToken()
        const updated = await apiPost<CommentResDto>(`/comments/${comment.id}/react`, token, { type })
        onCommentUpdated?.(updated)
      } catch (err) {
        console.error('Comment react error:', err)
      } finally {
        setReacting(false)
      }
    },
    [comment.id, reacting, getToken, onCommentUpdated],
  )

  const handleDelete = useCallback(() => {
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

  const liked = comment.userReaction === 'like'
  const disliked = comment.userReaction === 'dislike'

  return (
    <View className="mb-5">
      <View className="flex-row gap-3">

        {/* Body */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity activeOpacity={0.8} onPress={handleVisitProfile}>
              <Text className="text-[13px] font-semibold text-white/90">
                {comment.authorDisplayName || comment.authorUsername}
              </Text>
            </TouchableOpacity>
            <Text className="text-[12px] text-white/40">{timeAgo(comment.createdAt)}</Text>
          </View>

          <Text className="mt-0.5 text-[15px] leading-5 text-white">{comment.content}</Text>

          {/* Actions */}
          <View className="mt-2 flex-row items-center gap-4">
            <TouchableOpacity onPress={() => onReply?.(comment.id, comment.authorUsername)} activeOpacity={0.7}>
              <Text className="text-[12px] font-semibold text-white">Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleReact('dislike')}
              className="flex-row items-center gap-1"
              activeOpacity={0.7}
            >
              <Ionicons
                name={disliked ? 'heart-dislike' : 'heart-dislike-outline'}
                size={14}
                color={disliked ? Colors.secondaryContainer : 'rgba(255,255,255,0.55)'}
              />
              {comment.dislikeCount > 0 ? (
                <Text className="text-[12px] text-white/45">{comment.dislikeCount}</Text>
              ) : null}
            </TouchableOpacity>

            {comment.authorUsername === currentUsername ? (
              <TouchableOpacity onPress={handleDelete} disabled={deleting} activeOpacity={0.7}>
                {deleting ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Ionicons name="trash-outline" size={14} color="rgba(255,255,255,0.45)" />
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          {/* View / hide replies */}
          {!isReply && replyCount > 0 ? (
            <TouchableOpacity
              onPress={() => setShowReplies((v) => !v)}
              activeOpacity={0.7}
              className="mt-3 flex-row items-center gap-2"
            >
              <View className="h-px w-6 bg-white/25" />
              <Text className="text-[12px] font-semibold text-white/80">
                {showReplies
                  ? 'Hide replies'
                  : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Nested replies */}
          {!isReply && showReplies
            ? comment.replies?.map((reply) => (
                <View key={reply.id} className="mt-4">
                  <SheetComment
                    comment={reply}
                    isReply
                    onReply={onReply}
                    onCommentUpdated={onCommentUpdated}
                    onCommentDeleted={onCommentDeleted}
                    currentUsername={currentUsername}
                  />
                </View>
              ))
            : null}
        </View>

        {/* Like (right rail, Instagram style) */}
        <TouchableOpacity onPress={() => handleReact('like')} activeOpacity={0.7} className="items-center pt-1">
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color={liked ? LIKE_RED : 'rgba(255,255,255,0.7)'}
          />
          {comment.likeCount > 0 ? (
            <Text className="mt-1 text-[11px] text-white/50">{comment.likeCount}</Text>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ----------------------------------- Sheet ----------------------------------- */

interface Props {
  postId: string
}

export default function CommentsSheet({ postId }: Props) {
  const { user } = useUser()
  const { refreshToken } = useAuthToken()

  const commentInputRef = useRef<TextInput>(null)
  const [post, setPost] = useState<PostResDto | null>(null)
  const [comments, setComments] = useState<CommentResDto[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [visibleCommentCount, setVisibleCommentCount] = useState(COMMENTS_BATCH_SIZE)
  // Composer rests this far above the sheet bottom when the keyboard is closed
  // (clear of the home indicator); when open it rides on top of the keyboard.
  const restingComposerOffset = 8
  const composerPaddingBottom = useRef(new Animated.Value(restingComposerOffset)).current

  const fetchData = useCallback(async () => {
    const token = await refreshToken()
    if (!token) return
    try {
      const [postData, commentsData] = await Promise.all([
        apiFetch<PostResDto>(`/posts/${postId}`, token),
        apiFetch<CommentResDto[]>(`/comments/post/${postId}`, token),
      ])
      setPost(postData)
      setComments(commentsData)
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    } finally {
      setLoading(false)
    }
  }, [postId, refreshToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setVisibleCommentCount(COMMENTS_BATCH_SIZE)
  }, [postId])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const handleKeyboardShow = (event: RNKeyboardEvent) => {
      setIsKeyboardVisible(true)
      const keyboardHeight = event.endCoordinates?.height ?? 0
      Animated.timing(composerPaddingBottom, {
        toValue: keyboardHeight + 6,
        duration: Platform.OS === 'ios' ? (event.duration ?? 220) : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start()
    }

    const handleKeyboardHide = (event: RNKeyboardEvent) => {
      setIsKeyboardVisible(false)
      Animated.timing(composerPaddingBottom, {
        toValue: restingComposerOffset,
        duration: Platform.OS === 'ios' ? (event.duration ?? 220) : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start()
    }

    const showSub = Keyboard.addListener(showEvent, handleKeyboardShow)
    const hideSub = Keyboard.addListener(hideEvent, handleKeyboardHide)

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [composerPaddingBottom, restingComposerOffset])

  useEffect(() => {
    if (!isKeyboardVisible) {
      composerPaddingBottom.setValue(restingComposerOffset)
    }
  }, [composerPaddingBottom, restingComposerOffset, isKeyboardVisible])

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const token = await refreshToken()
      if (!token) return
      await apiPost<CommentResDto>(`/comments/post/${postId}`, token, {
        content: commentText.trim(),
        parentCommentId: replyTo?.id ?? null,
      })
      const updatedComments = await apiFetch<CommentResDto[]>(`/comments/post/${postId}`, token)
      setComments(updatedComments)
      setVisibleCommentCount((prev) => Math.min(updatedComments.length, Math.max(prev + 1, COMMENTS_BATCH_SIZE)))
      setCommentText('')
      setReplyTo(null)
    } catch (err) {
      console.error('Comment error:', err)
    } finally {
      setSubmitting(false)
    }
  }, [postId, commentText, replyTo, submitting, refreshToken])

  const handleCommentUpdated = useCallback((updated: CommentResDto) => {
    setComments((prev) => updateCommentInTree(prev, updated))
  }, [])

  const handleCommentDeleted = useCallback((commentId: string) => {
    setComments((prev) => removeCommentFromTree(prev, commentId))
  }, [])

  const visibleComments = useMemo(() => comments.slice(0, visibleCommentCount), [comments, visibleCommentCount])
  const remainingCommentCount = comments.length - visibleCommentCount
  const hasMoreComments = remainingCommentCount > 0
  const handleLoadMoreComments = useCallback(() => {
    setVisibleCommentCount((prev) => Math.min(prev + COMMENTS_BATCH_SIZE, comments.length))
  }, [comments.length])

  const renderedPostContent = useMemo(() => {
    if (!post?.content) {
      return { content: '', rawMarkdown: false }
    }
    const markdownFromLexical = lexicalContentToMarkdown(post.content)
    if (markdownFromLexical !== null) {
      return { content: markdownFromLexical, rawMarkdown: true }
    }
    return { content: post.content, rawMarkdown: false }
  }, [post?.content])

  const listHeader = useMemo(() => {
    const hasTitle = Boolean(post?.title?.trim())
    const hasBody = Boolean(renderedPostContent.content?.trim())
    return (
      <View>
        {hasTitle || hasBody ? (
          <View className="px-5 pt-1 pb-4">
            {hasTitle ? (
              <Text className="text-[19px] font-bold leading-6 tracking-tight text-white">
                {post!.title!.trim()}
              </Text>
            ) : null}
            {hasBody ? (
              <View className={hasTitle ? 'mt-2' : ''}>
                <MarkdownDisplay
                  content={renderedPostContent.content}
                  baseFontSize={15}
                  color="#ffffff"
                  rawMarkdown={renderedPostContent.rawMarkdown}
                  interactive
                />
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="mb-4 h-px bg-white/10" />
      </View>
    )
  }, [post, renderedPostContent])

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: SHEET_BG }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}
    >
      <FlatList
        style={{ flex: 1 }}
        data={visibleComments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <SheetComment
            comment={item}
            onReply={(id, username) => setReplyTo({ id, username })}
            onCommentUpdated={handleCommentUpdated}
            onCommentDeleted={handleCommentDeleted}
            currentUsername={user?.username ?? undefined}
          />
        )}
        ListEmptyComponent={(
          <Text className="px-5 py-6 text-center text-sm text-white/45">
            No comments yet. Be the first!
          </Text>
        )}
        ListFooterComponent={hasMoreComments ? (
          <TouchableOpacity
            onPress={handleLoadMoreComments}
            activeOpacity={0.8}
            className="mb-2 mt-1 self-start rounded-full bg-white/10 px-3 py-2"
          >
            <Text className="text-xs font-semibold text-white/80">
              Load {Math.min(COMMENTS_BATCH_SIZE, remainingCommentCount)} more comments
            </Text>
          </TouchableOpacity>
        ) : null}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {/* Composer */}
      <Animated.View
        className="border-t border-white/10 px-4 p-5"
        style={{ paddingBottom: composerPaddingBottom }}
      >
        {replyTo ? (
          <View className="mb-2 flex-row items-center justify-between px-1">
            <Text className="text-xs text-white/50">
              Replying to <Text className="font-semibold text-white/80">@{replyTo.username}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        ) : null}

        <View className="flex-row items-center">


          <View className="flex-1 flex-row items-center rounded-full border border-white bg-white/[0.06] pl-4 pr-1.5">
            <TextInput
              ref={commentInputRef}
              className="flex-1 py-3 text-[15px] text-white"
              placeholder="Join the conversation..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={commentText}
              onChangeText={setCommentText}
              multiline={false}
            />
            {commentText.trim() ? (
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={submitting}
                activeOpacity={0.7}
                className="h-8 w-8 items-center justify-center rounded-full"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={LIKE_RED} />
                ) : (
                  <Ionicons name="arrow-up-circle" size={30} color={LIKE_RED} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </View>
  )
}
