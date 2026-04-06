import { Ionicons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { useIsFocused } from '@react-navigation/native'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { router, useSegments } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { apiPost } from '@/lib/api'
import { lexicalContentToMarkdown, lexicalContentToPlainText } from '@/lib/lexicalContent'
import { normalizeMediaUrl } from '@/lib/media'
import { publicProfilePath, resolveHomeTab } from '@/lib/profileRoutes'
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
  isActive?: boolean
}

const MEDIA_DOUBLE_TAP_WINDOW_MS = 280

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
  isActive = true,
}: FeedPostCardProps) {
  const useGlass = isLiquidGlassAvailable()
  const segments = useSegments()
  const isScreenFocused = useIsFocused()
  const currentTab = resolveHomeTab(segments)
  const { getToken } = useAuth()
  const { user } = useUser()
  const [reacting, setReacting] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [mediaViewportWidth, setMediaViewportWidth] = useState(0)
  const [mediaScrollEnabled, setMediaScrollEnabled] = useState(true)
  const [pausedVideoIndices, setPausedVideoIndices] = useState<Set<number>>(() => new Set())
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
  const isPlaybackActive = isActive && isScreenFocused
  const isAuthor = Boolean(user?.id && user.id === post.authorClerkId)

  useEffect(() => {
    setActiveMediaIndex(0)
    setMediaScrollEnabled(true)
    setPausedVideoIndices(new Set())
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
      setPausedVideoIndices(new Set())
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

  const navigateToAuthor = () => {
    if (isAuthor) return
    router.push(publicProfilePath(post.authorId, currentTab) as any)
  }

  const handleMediaMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (mediaViewportWidth <= 0 || mediaCount <= 1) return
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / mediaViewportWidth)
      const bounded = Math.max(0, Math.min(nextIndex, mediaCount - 1))
      if (bounded !== activeMediaIndex) {
        setActiveMediaIndex(bounded)
      }
      revealCounter()
    },
    [activeMediaIndex, mediaCount, mediaViewportWidth, revealCounter],
  )

  const handleAudioScrubStateChange = useCallback((isScrubbing: boolean) => {
    setMediaScrollEnabled(!isScrubbing)
  }, [])

  const toggleVideoPauseState = useCallback((index: number) => {
    const media = post.media?.[index]
    if (!media?.type.startsWith('video/')) return
    if (!isCardActiveRef.current) return
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
          toggleVideoPauseState(index)
        }
      }, MEDIA_DOUBLE_TAP_WINDOW_MS)
    },
    [clearSingleMediaTapTimeout, handleReact, post.userReaction, toggleVideoPauseState, triggerHeartOverlay],
  )

  return (
    <View className="overflow-hidden bg-surface-container-lowest shadow-sm shadow-on-surface-variant/5">
      <TouchableOpacity
        onPress={navigateToPost}
        activeOpacity={0.9}
        className="px-4 pb-3 pt-4"
      >
        <View className="flex-row items-center justify-between pb-3">
          <TouchableOpacity
            activeOpacity={isAuthor ? 1 : 0.8}
            className="flex-1 flex-row items-center gap-2.5"
            onPress={isAuthor
              ? undefined
              : (event) => {
                  event.stopPropagation()
                  navigateToAuthor()
                }}
          >
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
                <Text className="text-[14px] font-semibold text-primary" numberOfLines={1}>
                  {post.communityName}
                </Text>
              </View>
              <Text className="text-[11px] font-medium tracking-wide text-on-surface-variant/60 uppercase">
                {timeAgo(post.createdAt)}
              </Text>
            </View>
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
              <>
                <Text
                  className={`text-[15px] leading-snug tracking-normal ${
                    post.title ? 'mt-2 text-on-surface-variant/80' : 'text-on-surface'
                  }`}
                  numberOfLines={post.title ? 2 : 4}
                  ellipsizeMode="tail"
                >
                  {excerpt}
                </Text>
                {showReadMore ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={(event) => {
                      event.stopPropagation()
                      navigateToPost()
                    }}
                    className="self-start mt-1"
                  >
                    <Text className="text-[13px] font-semibold text-primary">Read more</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {post.media && post.media.length > 0 ? (
          <View
            className="mt-1"
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
                    onScrollBeginDrag={revealCounter}
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
                    <Animated.View
                      pointerEvents="none"
                      className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1"
                      style={{ opacity: counterOpacity }}
                    >
                      <Text className="text-[11px] font-semibold text-white">
                        {activeMediaIndex + 1}/{mediaCount}
                      </Text>
                    </Animated.View>
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
      </TouchableOpacity>

      {/* Actions row — outside the card touchable to avoid nested touchable conflicts */}
      <View className="px-4 pb-4 flex-row items-center gap-3">
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

              <View className="w-[1px] bg-on-surface-variant/10 my-2" />

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

            <View className="w-[1px] bg-on-surface-variant/10 my-2" />

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
              onPress={navigateToPost}
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
            onPress={navigateToPost}
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
    </View>
  )
}
