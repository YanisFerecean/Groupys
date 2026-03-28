import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Animated,
  Modal,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio, AVPlaybackStatus } from 'expo-av'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { Colors } from '@/constants/colors'
import { useAuthToken } from '@/hooks/useAuthToken'
import GlassModalBackdrop from '@/components/ui/GlassModalBackdrop'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface MediaItem {
  url: string
  type: string
}

interface MediaLightboxProps {
  visible: boolean
  onClose: () => void
  allMedia: MediaItem[]
  initialIndex: number
}

interface MediaSlideProps {
  item: MediaItem
  isActive: boolean
  token: string | null
}

const BAR_COUNT = 32

// Pre-seeded per-bar random profiles so animation is consistent across play/pause
function makeBarProfiles(count: number) {
  return Array.from({ length: count }, () => ({
    min: Math.random() * 0.12 + 0.04,
    max: Math.random() * 0.65 + 0.35,
    duration: 180 + Math.floor(Math.random() * 320),
    delay: Math.floor(Math.random() * 250),
  }))
}

function AudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.08))
  ).current
  const profiles = useRef(makeBarProfiles(BAR_COUNT)).current
  const animationsRef = useRef<Animated.CompositeAnimation[]>([])

  useEffect(() => {
    animationsRef.current.forEach((a) => a.stop())
    animationsRef.current = []

    if (isPlaying) {
      bars.forEach((bar, i) => {
        const { min, max, duration, delay } = profiles[i]
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, { toValue: max, duration, useNativeDriver: false, delay: i === 0 ? 0 : delay }),
            Animated.timing(bar, { toValue: min, duration, useNativeDriver: false }),
          ])
        )
        animationsRef.current.push(loop)
        loop.start()
      })
    } else {
      bars.forEach((bar) =>
        Animated.timing(bar, { toValue: 0.08, duration: 250, useNativeDriver: false }).start()
      )
    }

    return () => {
      animationsRef.current.forEach((a) => a.stop())
    }
  }, [isPlaying])

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, gap: 2.5, marginBottom: 20, marginTop: 4 }}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            height: bar.interpolate({ inputRange: [0, 1], outputRange: [4, 52] }),
            backgroundColor: Colors.primary,
            opacity: bar.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          }}
        />
      ))}
    </View>
  )
}

const MediaSlide = React.memo(({ item, isActive, token }: MediaSlideProps) => {
  const [loading, setLoading] = useState(true)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)

  const isVideo = item.type.startsWith('video/')
  const isAudio = item.type.startsWith('audio/')
  const isImage = item.type.startsWith('image/')

  // expo-video player (pass auth headers for consistency)
  const player = useVideoPlayer(
    isVideo ? { uri: item.url, headers: token ? { Authorization: `Bearer ${token}` } : undefined } : null,
    (player) => {
    player.loop = false
    if (isActive) {
      player.play()
    }
  })


  useEffect(() => {
    if (isActive && isVideo && player) {
      player.play()
    } else if (!isActive && player) {
      player.pause()
    }
  }, [isActive, isVideo, player])

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis)
      setDuration(status.durationMillis || 0)
      setIsPlaying(status.isPlaying)
      if (status.didJustFinish) {
        setIsPlaying(false)
      }
    }
  }, [])

  const loadAudio = useCallback(async () => {
    try {
      setLoading(true)
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: item.url, headers: token ? { Authorization: `Bearer ${token}` } : {} },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      )
      soundRef.current = newSound
      setSound(newSound)
      setLoading(false)
    } catch (error) {
      console.error('Error loading audio', error)
      setLoading(false)
    }
  }, [item.url, token, onPlaybackStatusUpdate])

  // Unload on unmount — uses ref so it always has the live sound instance
  useEffect(() => {
    return () => {
      soundRef.current?.stopAsync().then(() => soundRef.current?.unloadAsync())
      soundRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isActive && isAudio) {
      loadAudio()
    }
  }, [isActive, isAudio, loadAudio])

  // Pause when swiped away
  useEffect(() => {
    if (!isActive && isAudio && soundRef.current) {
      soundRef.current.pauseAsync()
    }
  }, [isActive, isAudio])

  const handlePlayPause = async () => {
    if (!sound) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isPlaying) {
      await sound.pauseAsync()
    } else {
      await sound.playAsync()
    }
  }

  const formatTime = (millis: number) => {
    const totalSeconds = millis / 1000
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <View style={{ width: SCREEN_WIDTH }} className="items-center justify-center p-4">
      <View
        className="w-full items-center justify-center"
      >
        {isImage && (
          <View className="w-full aspect-square rounded-2xl overflow-hidden bg-black/20">
            <Image
              source={{ uri: item.url, headers: token ? { Authorization: `Bearer ${token}` } : {} }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          </View>
        )}

        {isVideo && player && (
          <View 
            className="w-full rounded-2xl overflow-hidden bg-black/20 items-center justify-center"
            style={{ width: '100%', height: 300 }}
          >
            <VideoView
              player={player}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              fullscreenOptions={{ enable: true }}
              nativeControls
            />
          </View>
        )}

        {isAudio && (
          <View className="w-full bg-white/10 p-8 rounded-3xl border border-white/20 items-center">
            <View className="w-16 h-16 bg-primary/20 rounded-full items-center justify-center mb-4">
              <Ionicons name="musical-notes" size={32} color={Colors.primary} />
            </View>

            <AudioVisualizer isPlaying={isPlaying} />

            <View className="w-full mb-6">
              <View className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-primary" 
                  style={{ width: duration ? `${(position / duration) * 100}%` : '0%' }} 
                />
              </View>
              <View className="flex-row justify-between mt-2">
                <Text className="text-white/60 text-xs">{formatTime(position)}</Text>
                <Text className="text-white/60 text-xs">{formatTime(duration)}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handlePlayPause}
              className="w-16 h-16 bg-primary rounded-full items-center justify-center"
            >
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={32} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        )}

        {loading && !isAudio && !isVideo && (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>
    </View>
  )
})

MediaSlide.displayName = 'MediaSlide'

export default function MediaLightbox({
  visible,
  onClose,
  allMedia,
  initialIndex,
}: MediaLightboxProps) {
  const { token } = useAuthToken()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const flatListRef = useRef<FlatList>(null)

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0)
    }
  }).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <GlassModalBackdrop onPress={onClose} intensity={78} tint="dark" />

        <View className="flex-1">
          <FlatList
            ref={flatListRef}
            data={allMedia}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => (
              <MediaSlide 
                item={item} 
                isActive={currentIndex === index} 
                token={token} 
              />
            )}
          />
        </View>

        {/* Pagination Dots */}
        {allMedia.length > 1 && (
          <View className="absolute bottom-12 w-full flex-row justify-center items-center gap-2">
            {allMedia.map((_, i) => (
              <View 
                key={i}
                className={`h-1.5 rounded-full ${i === currentIndex ? 'w-4 bg-primary' : 'w-1.5 bg-white/30'}`}
              />
            ))}
          </View>
        )}

        {/* Swipe Hint Label */}
        {allMedia.length > 1 && currentIndex === 0 && (
          <View className="absolute bottom-20 w-full items-center">
            <Text className="text-white/40 text-xs font-semibold uppercase tracking-widest">
              Swipe to explore 
              <Ionicons name="arrow-forward" size={10} color="rgba(255,255,255,0.4)" />
            </Text>
          </View>
        )}

        {/* Close Button */}
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-12 right-6 w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/10"
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </Modal>
  )
}
