import { Image } from 'expo-image'
import { useRouter, useSegments } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  Easing,
  PanResponder,
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
 * Instagram-style in-app notification banner. Renders the top-of-queue notification on a solid
 * (non-transparent) white card with a soft drop shadow, animates in from the top, auto-dismisses,
 * supports swipe-up to dismiss, and deep-links on tap. Shown only while the app is foregrounded.
 */
export default function InAppNotificationBanner() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const segments = useSegments()
  const current = useNotificationBannerStore((s) => s.current)
  const dismiss = useNotificationBannerStore((s) => s.dismiss)

  // Suppress the banner while the user is inside a chat conversation (Instagram-style):
  // route is .../chat/[conversationId].
  const isOnChatScreen = useMemo(() => {
    const idx = segments.lastIndexOf('chat')
    return idx !== -1 && segments[idx + 1] === '[conversationId]'
  }, [segments])

  const translateY = useRef(new Animated.Value(-160)).current
  const opacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    // On a chat conversation screen: drop the notification without showing the banner.
    if (isOnChatScreen) {
      dismiss()
      return
    }

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
  }, [current, dismiss, isOnChatScreen, handleDismiss, opacity, translateY])

  if (!current || isOnChatScreen) return null

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
      <View style={styles.surface}>{content}</View>
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
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    // Soft Instagram-style drop shadow (iOS) + elevation (Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  body: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.onSurfaceVariant,
  },
})
