import { Ionicons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { useIsFocused } from '@react-navigation/native'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { router, useSegments } from 'expo-router'
import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { apiPost } from '@/lib/api'
import { lexicalContentToMarkdown, lexicalContentToPlainText } from '@/lib/lexicalContent'
import { normalizeMediaUrl } from '@/lib/media'
import { publicProfilePath, resolveHomeTab } from '@/lib/profileRoutes'
import { sharePost } from '@/lib/shareLinks'
import { timeAgo } from '@/lib/timeAgo'
import { Colors } from '@/constants/colors'
import AuthImageWithToken from '@/components/ui/AuthImageWithToken'
import AudioAutoplayPreview from '@/components/ui/AudioAutoplayPreview'
import VideoThumbnail from '@/components/ui/VideoThumbnail'
import type { PostResDto } from '@/models/PostRes'

interface FeedPostCardProps {
  post: PostResDto
  onPostUpdated?: (updated: PostResDto) => void
  communityRoute?: string
  postRoute?: string
  /** When set, the comment button + "Read more" open this comments sheet route instead of the detail screen. */
  commentsRoute?: string
  isActive?: boolean
  /** Height of the fullscreen page this card fills (measured viewport above the tab bar). */
  height: number
}

const MEDIA_DOUBLE_TAP_WINDOW_MS = 280

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const

function RailButton({
  icon,
  label,
  onPress,
  count,
  active = false,
}: {
  icon: SymbolViewProps['name']
  label: string
  onPress: () => void
  count?: number
  active?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={label}
      className="items-center"
    >
      <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-black/35">
        <SymbolView name={icon} size={25} tintColor={active ? Colors.primary : '#ffffff'} />
      </View>
      {typeof count === 'number' && count > 0 ? (
        <Text className="mt-1 text-[12px] font-semibold text-white">{count}</Text>
      ) : null}
    </TouchableOpacity>
  )
}

function decodeBasicEntities(content: string) {
  return content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function truncateAtWordBoundary(content: string, maxLength: number) {
  if (content.length <= maxLength) {
    return { text: content, truncated: false }
  }

  const sliced = content.slice(0, maxLength)
  const lastBreak = Math.max(sliced.lastIndexOf(' '), sliced.lastIndexOf('\n'))
  const safeEnd = lastBreak > Math.floor(maxLength * 0.6) ? lastBreak : maxLength
  return { text: `${sliced.slice(0, safeEnd).trimEnd()}...`, truncated: true }
}

function markdownToPreviewText(markdown: string) {
  return decodeBasicEntities(markdown)
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^(\s*)[-*+]\s+/gm, '$1• ')
    .replace(/^(\s*)(\d+)\.\s+/gm, '$1$2. ')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?u>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getPostExcerpt(content: string, maxLength: number) {
  const lexicalMarkdown = lexicalContentToMarkdown(content)
  if (lexicalMarkdown) {
    return truncateAtWordBoundary(markdownToPreviewText(lexicalMarkdown), maxLength)
  }

  const lexicalPlainText = lexicalContentToPlainText(content)
  const plainText = decodeBasicEntities(lexicalPlainText ?? content)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, ' $1 ')
    .replace(/<\/?u>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return truncateAtWordBoundary(plainText, maxLength)
}

export default function FeedPostCard({
  post,
  onPostUpdated,
  communityRoute = '/(home)/(discover)/community',
  postRoute = '/(home)/(feed)/post',
  commentsRoute,
  isActive = true,
  height,
}: FeedPostCardProps) {
  const insets = useSafeAreaInsets()
  const { width: screenW } = useWindowDimensions()
  const segments = useSegments()
  const isScreenFocused = useIsFocused()
  const currentTab = resolveHomeTab(segments)
  const { getToken } = useAuth()
  const { user } = useUser()
  const [reacting, setReacting] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [mediaScrollEnabled, setMediaScrollEnabled] = useState(true)
  const [mutedVideoIndices, setMutedVideoIndices] = useState<Set<number>>(() => new Set())
  const lastMediaTapAtRef = useRef(0)
  const singleMediaTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeMediaIndexRef = useRef(0)
  const isCardActiveRef = useRef(isActive)
  const heartOverlayOpacity = useRef(new Animated.Value(0)).current
  const heartOverlayScale = useRef(new Animated.Value(0.7)).current
  const heartOverlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counterOpacity = useRef(new Animated.Value(0)).current
  const counterHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const authorName = post.authorDisplayName || post.authorUsername
  const excerptData = post.content
    ? getPostExcerpt(post.content, post.title ? 120 : 160)
    : { text: '', truncated: false }
  const excerpt = excerptData.text
  const showReadMore = Boolean(post.content?.trim()) && Boolean(excerpt)
  const mediaCount = post.media?.length ?? 0
  const hasMedia = mediaCount > 0
  const isPlaybackActive = isActive && isScreenFocused
  const isAuthor = Boolean(user?.id && user.id === post.authorClerkId)

  useEffect(() => {
    setActiveMediaIndex(0)
    setMediaScrollEnabled(true)
    setMutedVideoIndices(new Set())
    lastMediaTapAtRef.current = 0
    if (singleMediaTapTimeoutRef.current) {
      clearTimeout(singleMediaTapTimeoutRef.current)
      singleMediaTapTimeoutRef.current = null
    }
  }, [post.id, mediaCount])

  useEffect(() => {
    activeMediaIndexRef.current = activeMediaIndex
  }, [activeMediaIndex])

  useEffect(() => {
    isCardActiveRef.current = isPlaybackActive
    if (!isPlaybackActive) {
      setMutedVideoIndices(new Set())
      lastMediaTapAtRef.current = 0
      if (singleMediaTapTimeoutRef.current) {
        clearTimeout(singleMediaTapTimeoutRef.current)
        singleMediaTapTimeoutRef.current = null
      }
    }
  }, [isPlaybackActive])

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

  const clearCounterHideTimeout = useCallback(() => {
    if (counterHideTimeoutRef.current) {
      clearTimeout(counterHideTimeoutRef.current)
      counterHideTimeoutRef.current = null
    }
  }, [])

  const clearSingleMediaTapTimeout = useCallback(() => {
    if (singleMediaTapTimeoutRef.current) {
      clearTimeout(singleMediaTapTimeoutRef.current)
      singleMediaTapTimeoutRef.current = null
    }
  }, [])

  const scheduleCounterFadeOut = useCallback(() => {
    clearCounterHideTimeout()
    counterHideTimeoutRef.current = setTimeout(() => {
      Animated.timing(counterOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start()
    }, 1000)
  }, [clearCounterHideTimeout, counterOpacity])

  const revealCounter = useCallback(() => {
    if (mediaCount <= 1) return
    clearCounterHideTimeout()
    Animated.timing(counterOpacity, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      scheduleCounterFadeOut()
    })
  }, [clearCounterHideTimeout, counterOpacity, mediaCount, scheduleCounterFadeOut])

  useEffect(() => {
    if (mediaCount > 1) {
      counterOpacity.setValue(1)
      scheduleCounterFadeOut()
    } else {
      clearCounterHideTimeout()
      counterOpacity.setValue(0)
    }
    heartOverlayOpacity.setValue(0)
    heartOverlayScale.setValue(0.7)

    return () => {
      clearCounterHideTimeout()
      clearHeartOverlayTimeout()
      clearSingleMediaTapTimeout()
    }
  }, [clearCounterHideTimeout, clearHeartOverlayTimeout, clearSingleMediaTapTimeout, counterOpacity, heartOverlayOpacity, heartOverlayScale, mediaCount, post.id, scheduleCounterFadeOut])

  const handleReact = useCallback(
    async (type: 'like' | 'dislike', options?: { withHaptic?: boolean }) => {
      if (reacting) return
      setReacting(true)
      const withHaptic = options?.withHaptic ?? true
      if (withHaptic) {
        void Haptics.impactAsync(
          type === 'like'
            ? Haptics.ImpactFeedbackStyle.Light
            : Haptics.ImpactFeedbackStyle.Medium,
        )
      }
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

  const navigateToPost = () => {
    router.push(`${postRoute}/${post.id}` as any)
  }

  const openComments = () => {
    if (commentsRoute) {
      router.push(`${commentsRoute}/${post.id}` as any)
    } else {
      navigateToPost()
    }
  }

  const navigateToCommunity = () => {
    router.push(`${communityRoute}/${post.communityId}` as any)
  }

  const navigateToAuthor = () => {
    if (isAuthor) return
    router.push(publicProfilePath(post.authorId, currentTab) as any)
  }

  const handleMediaMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (screenW <= 0 || mediaCount <= 1) return
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenW)
      const bounded = Math.max(0, Math.min(nextIndex, mediaCount - 1))
      if (bounded !== activeMediaIndex) {
        setActiveMediaIndex(bounded)
      }
      revealCounter()
    },
    [activeMediaIndex, mediaCount, screenW, revealCounter],
  )

  const handleAudioScrubStateChange = useCallback((isScrubbing: boolean) => {
    setMediaScrollEnabled(!isScrubbing)
  }, [])

  const toggleVideoMuteState = useCallback((index: number) => {
    const media = post.media?.[index]
    if (!media?.type.startsWith('video/')) return
    if (!isCardActiveRef.current) return
    if (activeMediaIndexRef.current !== index) return

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setMutedVideoIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [post.media])

  const handleMediaPress = useCallback(
    (index: number, mediaType: string) => (event: GestureResponderEvent) => {
      event.stopPropagation()
      const now = Date.now()
      clearSingleMediaTapTimeout()

      if (now - lastMediaTapAtRef.current <= MEDIA_DOUBLE_TAP_WINDOW_MS) {
        lastMediaTapAtRef.current = 0
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        triggerHeartOverlay()
        if (post.userReaction !== 'like') {
          void handleReact('like', { withHaptic: false })
        }
        return
      }

      lastMediaTapAtRef.current = now
      singleMediaTapTimeoutRef.current = setTimeout(() => {
        lastMediaTapAtRef.current = 0
        singleMediaTapTimeoutRef.current = null
        if (mediaType.startsWith('video/')) {
          toggleVideoMuteState(index)
        }
      }, MEDIA_DOUBLE_TAP_WINDOW_MS)
    },
    [clearSingleMediaTapTimeout, handleReact, post.userReaction, toggleVideoMuteState, triggerHeartOverlay],
  )

  // Text-only posts have no media carousel — give them double-tap-to-like too.
  const handleTextDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastMediaTapAtRef.current <= MEDIA_DOUBLE_TAP_WINDOW_MS) {
      lastMediaTapAtRef.current = 0
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      triggerHeartOverlay()
      if (post.userReaction !== 'like') {
        void handleReact('like', { withHaptic: false })
      }
      return
    }
    lastMediaTapAtRef.current = now
  }, [handleReact, post.userReaction, triggerHeartOverlay])

  return (
    <View style={{ width: screenW, height }} className="bg-black">
      {/* (a) MEDIA / TEXT LAYER — fills the viewport */}
      {hasMedia ? (
        <ScrollView
          horizontal
          pagingEnabled
          scrollEnabled={mediaScrollEnabled}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          bounces={mediaCount > 1}
          onScrollBeginDrag={revealCounter}
          onMomentumScrollEnd={handleMediaMomentumEnd}
          scrollEventThrottle={16}
          style={StyleSheet.absoluteFill}
        >
          {(post.media ?? []).map((m, i) => (
            <TouchableOpacity
              key={i}
              onPress={handleMediaPress(i, m.type)}
              activeOpacity={1}
              style={{ width: screenW, height }}
            >
              {m.type.startsWith('image/') ? (
                <AuthImageWithToken
                  uri={normalizeMediaUrl(m.url)!}
                  className="h-full w-full"
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : m.type.startsWith('video/') ? (
                <View className="relative h-full w-full bg-black">
                  <VideoThumbnail
                    url={normalizeMediaUrl(m.url)!}
                    width="100%"
                    height="100%"
                    autoplay
                    isActive={isPlaybackActive && i === activeMediaIndex}
                    showPlaybackOverlay={false}
                    muted={mutedVideoIndices.has(i)}
                    loop
                    adaptiveFitByOrientation
                    contentFit="cover"
                    rounded={false}
                  />
                  {mutedVideoIndices.has(i) && i === activeMediaIndex ? (
                    <View
                      pointerEvents="none"
                      className="absolute inset-0 items-center justify-center"
                    >
                      <View className="h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-black/45">
                        <Ionicons name="volume-mute" size={26} color="white" />
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
                <View className="h-full w-full items-center justify-center bg-surface-container-high">
                  <Ionicons name="musical-notes" size={40} color={Colors.onSurfaceVariant} />
                  <Text className="mt-2 text-xs font-medium text-on-surface-variant/60">Audio File</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <LinearGradient
          colors={[Colors.primary, '#7a0020', '#1a0008']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleTextDoubleTap}
            className="flex-1 items-center justify-center px-8"
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 150 }}
          >
            {post.title ? (
              <Text className="text-center text-2xl font-bold text-white" numberOfLines={4}>
                {post.title}
              </Text>
            ) : null}
            {excerpt ? (
              <Text className="mt-3 text-center text-base leading-relaxed text-white/85" numberOfLines={8}>
                {excerpt}
              </Text>
            ) : null}
          </TouchableOpacity>
        </LinearGradient>
      )}

      {/* (c) media counter badge */}
      {hasMedia && mediaCount > 1 ? (
        <Animated.View
          pointerEvents="none"
          className="absolute right-3 rounded-full bg-black/55 px-2 py-1"
          style={{ top: insets.top + 12, opacity: counterOpacity }}
        >
          <Text className="text-[11px] font-semibold text-white">
            {activeMediaIndex + 1}/{mediaCount}
          </Text>
        </Animated.View>
      ) : null}

      {/* (b) double-tap heart overlay */}
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
        style={{
          opacity: heartOverlayOpacity,
          transform: [{ scale: heartOverlayScale }],
        }}
      >
        <SymbolView name="heart.fill" size={110} tintColor={Colors.primary} />
      </Animated.View>

      {/* media indicator dots */}
      {hasMedia && mediaCount > 1 ? (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 flex-row items-center justify-center gap-1.5"
          style={{ bottom: insets.bottom + 150 }}
        >
          {(post.media ?? []).map((_, i) => (
            <View
              key={`media-dot-${post.id}-${i}`}
              className="rounded-full"
              style={{
                width: i === activeMediaIndex ? 7 : 6,
                height: i === activeMediaIndex ? 7 : 6,
                backgroundColor: '#ffffff',
                opacity: i === activeMediaIndex ? 1 : 0.4,
              }}
            />
          ))}
        </View>
      ) : null}

      {/* (f) RIGHT ACTION RAIL */}
      <View className="absolute right-3 items-center gap-5" style={{ bottom: insets.bottom + 28 }}>
        <RailButton
          label="Like post"
          icon={post.userReaction === 'like' ? 'heart.fill' : 'heart'}
          active={post.userReaction === 'like'}
          count={post.likeCount}
          onPress={() => handleReact('like')}
        />
        <RailButton
          label="Dislike post"
          icon={post.userReaction === 'dislike' ? 'heart.slash.fill' : 'heart.slash'}
          active={post.userReaction === 'dislike'}
          count={post.dislikeCount}
          onPress={() => handleReact('dislike')}
        />
        <RailButton
          label="Comments"
          icon="text.bubble"
          count={post.commentCount}
          onPress={openComments}
        />
        <RailButton
          label="Share post"
          icon="square.and.arrow.up"
          onPress={() => void sharePost({ postId: post.id, title: post.title, authorName })}
        />
      </View>

      {/* (g) BOTTOM METADATA */}
      <View className="absolute bottom-0 left-4" style={{ paddingBottom: insets.bottom + 16, right: 84 }}>
        {/* 1. user + community info */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={navigateToCommunity}
          className="flex-row items-center self-start"
        >
          <Text className="text-[13px] font-semibold text-white/90" numberOfLines={1} style={TEXT_SHADOW}>
            # {post.communityName}
          </Text>
        </TouchableOpacity>

        {/* 2. username with profile picture */}
        <TouchableOpacity
          activeOpacity={isAuthor ? 1 : 0.8}
          onPress={isAuthor ? undefined : navigateToAuthor}
          className="mt-2 flex-row items-center gap-2.5"
        >
          {post.authorProfileImage ? (
            <Image
              source={{ uri: post.authorProfileImage }}
              className="h-9 w-9 rounded-full"
              style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' }}
              resizeMode="cover"
            />
          ) : (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Ionicons name="person" size={16} color="#ffffff" />
            </View>
          )}
          <Text className="text-[15px] font-bold text-white" numberOfLines={1} style={TEXT_SHADOW}>
            {authorName}
          </Text>
          <Text className="text-[12px] font-medium text-white/80" style={TEXT_SHADOW}>· {timeAgo(post.createdAt)}</Text>
        </TouchableOpacity>

        {/* 3. post bio / description (media posts; text-only posts show it centered above) */}
        {hasMedia && (post.title || excerpt) ? (
          <View className="mt-2">
            {post.title ? (
              <Text className="text-[15px] font-semibold text-white" numberOfLines={1} style={TEXT_SHADOW}>
                {post.title}
              </Text>
            ) : null}
            {excerpt ? (
              <Text className="mt-0.5 text-[14px] leading-snug text-white/90" numberOfLines={2} style={TEXT_SHADOW}>
                {excerpt}
              </Text>
            ) : null}
            {showReadMore ? (
              <TouchableOpacity activeOpacity={0.75} onPress={openComments} className="mt-1 self-start">
                <Text className="text-[13px] font-semibold text-white" style={TEXT_SHADOW}>Read more</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}
