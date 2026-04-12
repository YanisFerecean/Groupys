import { useImperativeHandle } from 'react'
import { Dimensions, Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import type { SuggestedUser } from '@/models/SuggestedUser'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35
const FLY_OUT_DURATION = 280

export interface CardHandle {
  swipeRight: () => void
  swipeLeft: () => void
}

interface Props {
  user: SuggestedUser
  stackIndex: number // 0 = top (interactive), 1, 2 = behind
  onLike: () => void
  onDismiss: () => void
  onViewProfile?: () => void
  ref?: React.Ref<CardHandle>
}

export default function UserRecommendationCard({ user, stackIndex, onLike, onDismiss, onViewProfile, ref }: Props) {
  const useGlass = isLiquidGlassAvailable()
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const cardRotation = useSharedValue(0)

  const triggerLike = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onLike()
  }

  const triggerDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onDismiss()
  }

  useImperativeHandle(ref, () => ({
    swipeRight: () => {
      translateX.value = withTiming(
        SCREEN_WIDTH * 1.6,
        { duration: FLY_OUT_DURATION },
        (finished) => {
          if (finished) runOnJS(triggerLike)()
        }
      )
      cardRotation.value = withTiming(20, { duration: FLY_OUT_DURATION })
    },
    swipeLeft: () => {
      translateX.value = withTiming(
        -SCREEN_WIDTH * 1.6,
        { duration: FLY_OUT_DURATION },
        (finished) => {
          if (finished) runOnJS(triggerDismiss)()
        }
      )
      cardRotation.value = withTiming(-20, { duration: FLY_OUT_DURATION })
    },
  }))

  const panGesture = Gesture.Pan()
    .enabled(stackIndex === 0)
    .onUpdate((event) => {
      translateX.value = event.translationX
      translateY.value = event.translationY * 0.3
      cardRotation.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-14, 0, 14],
        Extrapolation.CLAMP
      )
    })
    .onEnd((event) => {
      const shouldLike =
        event.translationX > SWIPE_THRESHOLD || event.velocityX > 800
      const shouldDismiss =
        event.translationX < -SWIPE_THRESHOLD || event.velocityX < -800

      if (shouldLike) {
        translateX.value = withTiming(
          SCREEN_WIDTH * 1.6,
          { duration: FLY_OUT_DURATION },
          (finished) => {
            if (finished) runOnJS(triggerLike)()
          }
        )
        cardRotation.value = withTiming(20, { duration: FLY_OUT_DURATION })
      } else if (shouldDismiss) {
        translateX.value = withTiming(
          -SCREEN_WIDTH * 1.6,
          { duration: FLY_OUT_DURATION },
          (finished) => {
            if (finished) runOnJS(triggerDismiss)()
          }
        )
        cardRotation.value = withTiming(-20, { duration: FLY_OUT_DURATION })
      } else {
        translateX.value = withSpring(0, { damping: 15 })
        translateY.value = withSpring(0, { damping: 15 })
        cardRotation.value = withSpring(0, { damping: 15 })
      }
    })

  const cardStyle = useAnimatedStyle(() => {
    const scale = 1 - stackIndex * 0.04
    const yOffset = stackIndex === 0 ? translateY.value : stackIndex * 12
    return {
      transform: [
        { translateX: stackIndex === 0 ? translateX.value : 0 },
        { translateY: yOffset },
        { rotate: `${stackIndex === 0 ? cardRotation.value : 0}deg` },
        { scale },
      ],
    }
  })

  const followOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.5],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }))

  const passOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD * 0.5, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }))

  const vibePercent = Math.round(user.score * 100)

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, backgroundColor: '#1e1e1e' }, cardStyle]}
        className="rounded-[28px] overflow-hidden"
      >
        {user.profileImage ? (
          <Image
            source={{ uri: user.profileImage }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{ width: '100%', height: '100%', backgroundColor: '#1e1e1e' }}
            className="items-center justify-center"
          >
            <Ionicons name="person" size={96} color="rgba(255,255,255,0.15)" />
          </View>
        )}

        {/* Bottom gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.88)']}
          locations={[0, 0.4, 1]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' }}
        />

        {/* FOLLOW stamp */}
        <Animated.View
          style={[
            followOverlayStyle,
            {
              position: 'absolute',
              top: 44,
              left: 20,
              transform: [{ rotate: '-18deg' }],
            },
          ]}
        >
          {useGlass ? (
            <GlassView style={{ borderRadius: 16, overflow: 'hidden' }}>
              <View
                style={{
                  borderWidth: 2,
                  borderColor: 'rgba(74, 222, 128, 0.8)',
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#4ade80', fontWeight: '900', fontSize: 20, letterSpacing: 1.2 }}>
                  AUX YES 🎧
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 10, letterSpacing: 0.6 }}>
                  BANGER ENERGY
                </Text>
              </View>
            </GlassView>
          ) : (
            <View
              style={{
                borderWidth: 3,
                borderColor: '#4ade80',
                borderRadius: 16,
                backgroundColor: 'rgba(8, 30, 12, 0.45)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#4ade80', fontWeight: '900', fontSize: 20, letterSpacing: 1.2 }}>
                AUX YES 🎧
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 10, letterSpacing: 0.6 }}>
                BANGER ENERGY
              </Text>
            </View>
          )}
        </Animated.View>

        {/* PASS stamp */}
        <Animated.View
          style={[
            passOverlayStyle,
            {
              position: 'absolute',
              top: 44,
              right: 20,
              transform: [{ rotate: '18deg' }],
            },
          ]}
        >
          {useGlass ? (
            <GlassView style={{ borderRadius: 16, overflow: 'hidden' }}>
              <View
                style={{
                  borderWidth: 2,
                  borderColor: 'rgba(248, 113, 113, 0.8)',
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#f87171', fontWeight: '900', fontSize: 20, letterSpacing: 1.2 }}>
                  SKIP IT ⏭️
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 10, letterSpacing: 0.6 }}>
                  NOT ON MY AUX
                </Text>
              </View>
            </GlassView>
          ) : (
            <View
              style={{
                borderWidth: 3,
                borderColor: '#f87171',
                borderRadius: 16,
                backgroundColor: 'rgba(32, 10, 10, 0.45)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#f87171', fontWeight: '900', fontSize: 20, letterSpacing: 1.2 }}>
                SKIP IT ⏭️
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 10, letterSpacing: 0.6 }}>
                NOT ON MY AUX
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Bottom metadata */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, gap: 6 }}>
          {/* Name */}
          <Text className="text-[26px] font-extrabold text-white" numberOfLines={1}>
            {user.displayName ?? user.username}
          </Text>

          {/* Username */}
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600' }}>
            @{user.username}
          </Text>

          {/* Explanation */}
          {!!user.explanation && (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' }}>
              {user.explanation}
            </Text>
          )}

          {/* Matched artists */}
          {user.matchedArtists?.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-1">
              {user.matchedArtists.slice(0, 3).map((artist) => (
                <View key={artist.id} className="bg-primary/70 px-3 py-1 rounded-full">
                  <Text className="text-xs font-bold text-white">{artist.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Matched genres */}
          {user.matchedGenres?.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {user.matchedGenres.slice(0, 3).map((genre) => (
                <View
                  key={genre.id}
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                  className="px-3 py-1 rounded-full"
                >
                  <Text className="text-xs font-bold text-white">{genre.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Social context */}
          {(user.mutualFollowCount > 0 || user.sharedCommunityCount > 0 || user.sameCountry) && (
            <View className="flex-row items-center gap-3 mt-1">
              {user.mutualFollowCount > 0 && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.65)" />
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                    {user.mutualFollowCount} mutual
                  </Text>
                </View>
              )}
              {user.sharedCommunityCount > 0 && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="people-circle-outline" size={13} color="rgba(255,255,255,0.65)" />
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                    {user.sharedCommunityCount} shared
                  </Text>
                </View>
              )}
              {user.sameCountry && (
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>🌍 Same country</Text>
              )}
            </View>
          )}

          {onViewProfile ? (
            useGlass ? (
              <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden', alignSelf: 'flex-start', marginTop: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onViewProfile}
                  className="rounded-full px-4 py-2"
                >
                  <Text className="text-xs font-bold text-white">View Profile</Text>
                </TouchableOpacity>
              </GlassView>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onViewProfile}
                className="self-start mt-2 rounded-full bg-white/15 px-4 py-2"
              >
                <Text className="text-xs font-bold text-white">View Profile</Text>
              </TouchableOpacity>
            )
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  )
}
