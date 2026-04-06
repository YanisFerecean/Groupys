import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@clerk/expo'
import { useIsFocused } from '@react-navigation/native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  type GestureResponderEvent,
  type KeyboardEvent as RNKeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { SymbolView } from 'expo-symbols'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { apiDelete, apiFetch, apiPost } from '@/lib/api'
import { lexicalContentToMarkdown } from '@/lib/lexicalContent'
import { normalizeMediaUrl } from '@/lib/media'
import { communityDetailPath, publicProfilePath, resolveHomeTab } from '@/lib/profileRoutes'
import { timeAgo } from '@/lib/timeAgo'
import { Colors } from '@/constants/colors'
import AuthImageWithToken from '@/components/ui/AuthImageWithToken'
import AudioAutoplayPreview from '@/components/ui/AudioAutoplayPreview'
import VideoThumbnail from '@/components/ui/VideoThumbnail'
import { useAuthToken } from '@/hooks/useAuthToken'
import CommentItem from '@/components/post/CommentItem'
import type { PostResDto } from '@/models/PostRes'
import type { CommentResDto } from '@/models/CommentRes'
import type { CommunityResDto } from '@/models/CommunityRes'

const HERO_COLORS = [
  '#7c3aed', '#be185d', '#0891b2', '#b45309', '#059669', '#6366f1',
  '#dc2626', '#2563eb', '#7c2d12', '#4f46e5',
]
const COMMENTS_BATCH_SIZE = 12
const MEDIA_DOUBLE_TAP_WINDOW_MS = 280

function heroColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return HERO_COLORS[Math.abs(hash) % HERO_COLORS.length]
}

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

interface Props {
  postId: string
}

export default function PostDetailScreen({ postId }: Props) {
  const useGlass = isLiquidGlassAvailable()
  const insets = useSafeAreaInsets()
  const segments = useSegments()
  const isScreenFocused = useIsFocused()
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
  const [postReacting, setPostReacting] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [mediaViewportWidth, setMediaViewportWidth] = useState(0)
  const [mediaScrollEnabled, setMediaScrollEnabled] = useState(true)
  const [pausedVideoIndices, setPausedVideoIndices] = useState<Set<number>>(() => new Set())
  const [visibleCommentCount, setVisibleCommentCount] = useState(COMMENTS_BATCH_SIZE)
  const lastMediaTapAtRef = useRef(0)
  const singleMediaTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeMediaIndexRef = useRef(0)
  const heartOverlayOpacity = useRef(new Animated.Value(0)).current
  const heartOverlayScale = useRef(new Animated.Value(0.7)).current
  const heartOverlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const collapsedComposerPaddingBottom = 4
  const expandedComposerPaddingBottom = Math.max(insets.bottom - 6, collapsedComposerPaddingBottom)
  const composerPaddingBottom = useRef(new Animated.Value(expandedComposerPaddingBottom)).current

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

  useEffect(() => {
    setVisibleCommentCount(COMMENTS_BATCH_SIZE)
  }, [postId])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const handleKeyboardShow = (event: RNKeyboardEvent) => {
      setIsKeyboardVisible(true)
      Animated.timing(composerPaddingBottom, {
        toValue: collapsedComposerPaddingBottom,
        duration: Platform.OS === 'ios' ? (event.duration ?? 220) : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start()
    }

    const handleKeyboardHide = (event: RNKeyboardEvent) => {
      setIsKeyboardVisible(false)
      Animated.timing(composerPaddingBottom, {
        toValue: expandedComposerPaddingBottom,
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
  }, [collapsedComposerPaddingBottom, composerPaddingBottom, expandedComposerPaddingBottom])

  useEffect(() => {
    if (!isKeyboardVisible) {
      composerPaddingBottom.setValue(expandedComposerPaddingBottom)
    }
  }, [composerPaddingBottom, expandedComposerPaddingBottom, isKeyboardVisible])

  const clearHeartOverlayTimeout = useCallback(() => {
    if (heartOverlayTimeoutRef.current) {
      clearTimeout(heartOverlayTimeoutRef.current)
      heartOverlayTimeoutRef.current = null
    }
  }, [])

  const triggerHeartOverlay = useCallback(() => {
    clearHeartOverlayTimeout()
    heartOverlayOpacity.stopAnimation()
    heartOverlayScale.stopAnimation()
    heartOverlayOpacity.setValue(0)
    heartOverlayScale.setValue(0.7)

    Animated.parallel([
      Animated.timing(heartOverlayOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(heartOverlayScale, {
        toValue: 1,
        damping: 12,
        stiffness: 250,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start(() => {
      heartOverlayTimeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(heartOverlayOpacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(heartOverlayScale, {
            toValue: 1.08,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start()
      }, 420)
    })
  }, [clearHeartOverlayTimeout, heartOverlayOpacity, heartOverlayScale])

  const handleReact = useCallback(
    async (type: 'like' | 'dislike', options?: { withHaptic?: boolean }) => {
      if (postReacting) return
      setPostReacting(true)
      const withHaptic = options?.withHaptic ?? true
      if (withHaptic) {
        void Haptics.impactAsync(
          type === 'like'
            ? Haptics.ImpactFeedbackStyle.Light
            : Haptics.ImpactFeedbackStyle.Medium,
        )
      }
      try {
        const token = await refreshToken()
        if (!token) return
        const updated = await apiPost<PostResDto>(`/posts/${postId}/react`, token, { type })
        setPost(updated)
      } catch (err) {
        console.error('React error:', err)
      } finally {
        setPostReacting(false)
      }
    },
    [postId, postReacting, refreshToken],
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
      setVisibleCommentCount((prev) => Math.min(updatedComments.length, Math.max(prev + 1, COMMENTS_BATCH_SIZE)))
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
    if (user?.id === post.authorClerkId) return
    router.push(publicProfilePath(post.authorId, currentTab) as any)
  }, [currentTab, post, user?.id])

  const mediaCount = post?.media?.length ?? 0
  const isPlaybackActive = isScreenFocused

  useEffect(() => {
    activeMediaIndexRef.current = activeMediaIndex
  }, [activeMediaIndex])

  const clearSingleMediaTapTimeout = useCallback(() => {
    if (singleMediaTapTimeoutRef.current) {
      clearTimeout(singleMediaTapTimeoutRef.current)
      singleMediaTapTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    setActiveMediaIndex(0)
    setMediaScrollEnabled(true)
    setPausedVideoIndices(new Set())
    lastMediaTapAtRef.current = 0
    clearSingleMediaTapTimeout()
    clearHeartOverlayTimeout()
    heartOverlayOpacity.setValue(0)
    heartOverlayScale.setValue(0.7)
    return () => {
      clearSingleMediaTapTimeout()
      clearHeartOverlayTimeout()
    }
  }, [clearHeartOverlayTimeout, clearSingleMediaTapTimeout, heartOverlayOpacity, heartOverlayScale, mediaCount, post?.id])

  const handleMediaMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (mediaViewportWidth <= 0 || mediaCount <= 1) return
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / mediaViewportWidth)
      const bounded = Math.max(0, Math.min(nextIndex, mediaCount - 1))
      if (bounded !== activeMediaIndex) {
        setActiveMediaIndex(bounded)
      }
    },
    [activeMediaIndex, mediaCount, mediaViewportWidth],
  )

  const handleAudioScrubStateChange = useCallback((isScrubbing: boolean) => {
    setMediaScrollEnabled(!isScrubbing)
  }, [])

  const toggleVideoPauseState = useCallback((index: number) => {
    const media = post?.media?.[index]
    if (!media?.type.startsWith('video/')) return
    if (!isPlaybackActive) return
    if (activeMediaIndexRef.current !== index) return

    setPausedVideoIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [isPlaybackActive, post?.media])

  const handleMediaPress = useCallback(
    (index: number, mediaType: string) => (event: GestureResponderEvent) => {
      event.stopPropagation()
      const now = Date.now()
      clearSingleMediaTapTimeout()

      if (now - lastMediaTapAtRef.current <= MEDIA_DOUBLE_TAP_WINDOW_MS) {
        lastMediaTapAtRef.current = 0
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        triggerHeartOverlay()
        if (post?.userReaction !== 'like') {
          void handleReact('like', { withHaptic: false })
        }
        return
      }

      lastMediaTapAtRef.current = now
      singleMediaTapTimeoutRef.current = setTimeout(() => {
        lastMediaTapAtRef.current = 0
        singleMediaTapTimeoutRef.current = null
        if (mediaType.startsWith('video/')) {
          toggleVideoPauseState(index)
        }
      }, MEDIA_DOUBLE_TAP_WINDOW_MS)
    },
    [clearSingleMediaTapTimeout, handleReact, post?.userReaction, toggleVideoPauseState, triggerHeartOverlay],
  )

  const hasMedia = post?.media && post.media.length > 0
  const isAuthor = user && post && user.id === post.authorClerkId
  const communityColor = community ? heroColor(community.id) : '#4f46e5'
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Back button */}
      <View className="absolute z-10 left-5" style={{ top: insets.top + 8 }}>
        {useGlass ? (
          <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center"
              activeOpacity={0.7}
            >
              <SymbolView name="chevron.left" size={20} tintColor="#000" />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30"
          >
            <Ionicons name="chevron-back" size={22} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
                    uri={normalizeMediaUrl(community.bannerUrl)!}
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
                      uri={normalizeMediaUrl(community.iconUrl)!}
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
                            {community.memberCount} Members
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

          </View>
        ) : null}

        {/* Post content */}
        <View className="px-5">
          {/* Author */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              activeOpacity={isAuthor ? 1 : 0.8}
              className="flex-row items-center gap-3"
              onPress={isAuthor ? undefined : handleVisitAuthor}
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
              useGlass ? (
                <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={deleting}
                    className="h-10 w-10 items-center justify-center"
                    activeOpacity={0.7}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                      <SymbolView name="trash" size={16} tintColor="#dc2626" />
                    )}
                  </TouchableOpacity>
                </GlassView>
              ) : (
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={deleting}
                  className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-low"
                  activeOpacity={0.7}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  )}
                </TouchableOpacity>
              )
            )}
          </View>

          {post.title?.trim() ? (
            <View className="mb-3">
              <Text className="text-[24px] font-bold leading-8 tracking-tight text-on-surface">
                {post.title.trim()}
              </Text>
            </View>
          ) : null}

          {/* Full content */}
          {post.content ? (
            <View className="mb-4">
              <MarkdownDisplay
                content={renderedPostContent.content}
                baseFontSize={16}
                color={Colors.onSurface}
                rawMarkdown={renderedPostContent.rawMarkdown}
                interactive
              />
            </View>
          ) : null}

          {/* Media */}
          {hasMedia ? (
            <View
              className="mb-4 mt-1"
              onLayout={(event) => {
                const measuredWidth = Math.floor(event.nativeEvent.layout.width)
                if (measuredWidth > 0 && measuredWidth !== mediaViewportWidth) {
                  setMediaViewportWidth(measuredWidth)
                }
              }}
            >
              {mediaViewportWidth > 0 ? (
                <>
                  <View
                    className="overflow-hidden rounded-[24px] bg-surface-container-high"
                    style={{ width: mediaViewportWidth, aspectRatio: 4 / 5 }}
                  >
                    <ScrollView
                      horizontal
                      pagingEnabled
                      scrollEnabled={mediaScrollEnabled}
                      decelerationRate="fast"
                      showsHorizontalScrollIndicator={false}
                      bounces={mediaCount > 1}
                      onMomentumScrollEnd={handleMediaMomentumEnd}
                      scrollEventThrottle={16}
                      style={{ flex: 1 }}
                    >
                      {post.media.map((m, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={handleMediaPress(i, m.type)}
                          activeOpacity={1}
                          style={{ width: mediaViewportWidth, height: '100%' }}
                        >
                          {m.type.startsWith('image/') ? (
                            <AuthImageWithToken
                              uri={normalizeMediaUrl(m.url)!}
                              className="h-full w-full"
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="contain"
                            />
                          ) : m.type.startsWith('video/') ? (
                            <View className="relative h-full w-full bg-black">
                              <VideoThumbnail
                                url={normalizeMediaUrl(m.url)!}
                                width="100%"
                                height="100%"
                                autoplay
                                isActive={isPlaybackActive && i === activeMediaIndex && !pausedVideoIndices.has(i)}
                                showPlaybackOverlay={false}
                                muted={false}
                                loop
                                adaptiveFitByOrientation
                                contentFit="cover"
                                rounded={false}
                              />
                              {pausedVideoIndices.has(i) && i === activeMediaIndex ? (
                                <View
                                  pointerEvents="none"
                                  className="absolute inset-0 items-center justify-center bg-black/20"
                                >
                                  <View className="h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-black/45">
                                    <Ionicons name="play" size={28} color="white" style={{ marginLeft: 3 }} />
                                  </View>
                                </View>
                              ) : null}
                            </View>
                          ) : m.type.startsWith('audio/') ? (
                            <AudioAutoplayPreview
                              url={normalizeMediaUrl(m.url)!}
                              isActive={isPlaybackActive && i === activeMediaIndex}
                              width="100%"
                              height="100%"
                              onScrubStateChange={handleAudioScrubStateChange}
                            />
                          ) : (
                            <View
                              className="h-full w-full items-center justify-center bg-surface-container-high"
                            >
                              <Ionicons name="musical-notes" size={40} color={Colors.onSurfaceVariant} />
                              <Text className="mt-2 text-xs font-medium text-on-surface-variant/60">Audio File</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {mediaCount > 1 ? (
                      <View className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1">
                        <Text className="text-[11px] font-semibold text-white">
                          {activeMediaIndex + 1}/{mediaCount}
                        </Text>
                      </View>
                    ) : null}

                    <Animated.View
                      pointerEvents="none"
                      className="absolute inset-0 items-center justify-center"
                      style={{
                        opacity: heartOverlayOpacity,
                        transform: [{ scale: heartOverlayScale }],
                      }}
                    >
                      <SymbolView name="heart.fill" size={96} tintColor={Colors.primary} />
                    </Animated.View>
                  </View>

                  {mediaCount > 1 ? (
                    <View className="mt-2 flex-row items-center justify-center gap-1.5">
                      {post.media.map((_, i) => (
                        <View
                          key={`media-dot-${post.id}-${i}`}
                          className="rounded-full"
                          style={{
                            width: i === activeMediaIndex ? 8 : 6,
                            height: i === activeMediaIndex ? 8 : 6,
                            backgroundColor: Colors.primary,
                            opacity: i === activeMediaIndex ? 1 : 0.35,
                          }}
                        />
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          {/* Reactions */}
          <View className="mb-4 flex-row items-center gap-3 border-y border-surface-container-high/50 py-3">
            {useGlass ? (
              <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => handleReact('like')}
                    className={`flex-row items-center gap-2 px-4 py-2 ${
                      post.userReaction === 'like' ? 'bg-primary/10' : ''
                    }`}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={post.userReaction === 'like' ? 'heart.fill' : 'heart'}
                      size={18}
                      tintColor={Colors.primary}
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

                  <View className="my-2 w-[1px] bg-on-surface-variant/10" />

                  <TouchableOpacity
                    onPress={() => handleReact('dislike')}
                    className={`flex-row items-center px-4 py-2 ${
                      post.userReaction === 'dislike' ? 'bg-primary/10' : ''
                    }`}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={post.userReaction === 'dislike' ? 'heart.slash.fill' : 'heart.slash'}
                      size={18}
                      tintColor={Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </GlassView>
            ) : (
              <View className="flex-row overflow-hidden rounded-full bg-surface-container-low/50">
                <TouchableOpacity
                  onPress={() => handleReact('like')}
                  className={`flex-row items-center gap-2 px-4 py-2 ${
                    post.userReaction === 'like' ? 'bg-primary/10' : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <SymbolView
                    name={post.userReaction === 'like' ? 'heart.fill' : 'heart'}
                    size={18}
                    tintColor={Colors.primary}
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

                <View className="my-2 w-[1px] bg-on-surface-variant/10" />

                <TouchableOpacity
                  onPress={() => handleReact('dislike')}
                  className={`flex-row items-center px-4 py-2 ${
                    post.userReaction === 'dislike' ? 'bg-primary/10' : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <SymbolView
                    name={post.userReaction === 'dislike' ? 'heart.slash.fill' : 'heart.slash'}
                    size={18}
                    tintColor={Colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}

            {useGlass ? (
              <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
                <TouchableOpacity
                  onPress={() => commentInputRef.current?.focus()}
                  className="flex-row items-center gap-2 px-4 py-2"
                  activeOpacity={0.7}
                >
                  <SymbolView name="text.bubble" size={17} tintColor={Colors.primary} />
                  {post.commentCount > 0 && (
                    <Text className="text-[13px] font-bold text-on-surface-variant">
                      {post.commentCount}
                    </Text>
                  )}
                </TouchableOpacity>
              </GlassView>
            ) : (
              <TouchableOpacity
                onPress={() => commentInputRef.current?.focus()}
                className="flex-row items-center gap-2 rounded-full bg-surface-container-low/50 px-4 py-2"
                activeOpacity={0.7}
              >
                <SymbolView name="text.bubble" size={17} tintColor={Colors.primary} />
                {post.commentCount > 0 && (
                  <Text className="text-[13px] font-bold text-on-surface-variant">
                    {post.commentCount}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <View className="flex-1" />

            {useGlass ? (
              <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full"
                  activeOpacity={0.7}
                >
                  <SymbolView name="square.and.arrow.up" size={17} tintColor={Colors.primary} />
                </TouchableOpacity>
              </GlassView>
            ) : (
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-surface-container-low/50"
                activeOpacity={0.7}
              >
                <SymbolView name="square.and.arrow.up" size={17} tintColor={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Comments */}
          <Text className="text-on-surface font-bold text-base mb-3">Comments</Text>
          {comments.length === 0 ? (
            <Text className="text-on-surface-variant text-sm py-4">No comments yet. Be the first!</Text>
          ) : (
            <>
              {visibleComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={(id, username) => setReplyTo({ id, username })}
                  onCommentUpdated={handleCommentUpdated}
                  onCommentDeleted={handleCommentDeleted}
                  currentUsername={user?.username ?? undefined}
                />
              ))}

              {hasMoreComments ? (
                <TouchableOpacity
                  onPress={handleLoadMoreComments}
                  activeOpacity={0.8}
                  className="mb-2 mt-1 self-start rounded-full bg-surface-container-high px-3 py-2"
                >
                  <Text className="text-xs font-semibold text-primary">
                    Load {Math.min(COMMENTS_BATCH_SIZE, remainingCommentCount)} more comments
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      {/* Comment input */}
      <Animated.View
        className="border-t border-surface-container-high/50 bg-surface px-5 pt-3"
        style={{
          paddingBottom: composerPaddingBottom,
        }}
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
        {useGlass ? (
          <View className="flex-row items-center gap-3">
            <GlassView isInteractive style={{ flex: 1, borderRadius: 999, overflow: 'hidden' }}>
              <View className="px-5 py-3.5">
                <TextInput
                  ref={commentInputRef}
                  className="text-base text-on-surface"
                  placeholder="Add a comment..."
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline={false}
                />
              </View>
            </GlassView>

            <GlassView
              isInteractive
              style={{
                borderRadius: 999,
                overflow: 'hidden',
                opacity: commentText.trim() && !submitting ? 1 : 0.55,
              }}
            >
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                className="h-12 w-12 items-center justify-center"
                activeOpacity={0.7}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <SymbolView
                    name="paperplane.fill"
                    size={18}
                    tintColor={commentText.trim() ? Colors.primary : Colors.onSurfaceVariant}
                  />
                )}
              </TouchableOpacity>
            </GlassView>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <TextInput
              ref={commentInputRef}
              className="flex-1 bg-surface-container-low rounded-full px-5 py-3.5 text-base text-on-surface"
              placeholder="Add a comment..."
              placeholderTextColor={Colors.onSurfaceVariant}
              value={commentText}
              onChangeText={setCommentText}
              multiline={false}
            />
            <TouchableOpacity
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                commentText.trim() ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={commentText.trim() ? '#fff' : '#999'}
                />
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  )
}
