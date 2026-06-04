import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { useNotificationBannerStore } from '@/stores/useNotificationBannerStore'

const AUTO_DISMISS_MS = 4200

/**
 * Minimal, on-brand in-app notification banner. Renders the top-of-queue notification with a
 * liquid-glass surface, animates in from the top, auto-dismisses, supports swipe-up to dismiss,
 * and deep-links on tap. Shown only while the app is foregrounded.
 */
export default function InAppNotificationBanner() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const current = useNotificationBannerStore((s) => s.current)
  const dismiss = useNotificationBannerStore((s) => s.dismiss)

  const translateY = useRef(new Animated.Value(-160)).current
  const opacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canUseLiquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable()

  const animateOut = useCallback(
    (after?: () => void) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -160,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) after?.()
      })
    },
    [opacity, translateY],
  )

  const handleDismiss = useCallback(() => {
    animateOut(() => dismiss())
  }, [animateOut, dismiss])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy < -6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy < 0) translateY.setValue(g.dy)
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy < -40) {
            handleDismiss()
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start()
          }
        },
      }),
    [handleDismiss, translateY],
  )

  useEffect(() => {
    if (!current) return

    translateY.setValue(-160)
    opacity.setValue(0)
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 7,
        speed: 14,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start()

    timerRef.current = setTimeout(() => handleDismiss(), AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [current, handleDismiss, opacity, translateY])

  if (!current) return null

  const handlePress = () => {
    const target = current.deeplink
    animateOut(() => {
      dismiss()
      if (target) {
        router.push(target as never)
      }
    })
  }

  const content = (
    <Pressable onPress={handlePress} style={styles.row} accessibilityRole="button">
      {current.imageUrl ? (
        <Image source={{ uri: current.imageUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarGlyph}>♪</Text>
        </View>
      )}
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {current.title}
        </Text>
        {current.body ? (
          <Text style={styles.body} numberOfLines={2}>
            {current.body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 6, opacity, transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      {canUseLiquidGlass ? (
        <GlassView style={styles.surface}>{content}</GlassView>
      ) : (
        <BlurView tint="systemMaterial" intensity={88} style={[styles.surface, styles.surfaceFallback]}>
          {content}
        </BlurView>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  surface: {
    borderRadius: 22,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  surfaceFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  avatarGlyph: {
    color: Colors.onPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  body: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
})
