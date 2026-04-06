import { Ionicons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { Redirect, useGlobalSearchParams, useRouter, useSegments } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { SymbolView } from 'expo-symbols'
import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Animated, Easing, Keyboard, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions, type KeyboardEvent as RNKeyboardEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChatProvider } from '@/components/chat/ChatProvider'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { Colors } from '@/constants/colors'
import { isAccountSetupComplete } from '@/lib/auth'

type HomeTabName = '(feed)' | '(create-post)' | '(match)' | '(profile)' | '(discover)'
type IoniconName = ComponentProps<typeof Ionicons>['name']
type SymbolName = ComponentProps<typeof SymbolView>['name']

const HOME_TAB_LABELS: Record<HomeTabName, string> = {
  '(feed)': 'Feed',
  '(create-post)': 'Post',
  '(match)': 'Mutuals',
  '(profile)': 'Profile',
  '(discover)': 'Discover',
}

const HOME_TAB_ROUTE: Record<HomeTabName, string> = {
  '(feed)': '/(home)/(feed)',
  '(create-post)': '/(home)/(create-post)',
  '(match)': '/(home)/(match)',
  '(profile)': '/(home)/(profile)',
  '(discover)': '/(home)/(discover)',
}

const HOME_TAB_RETURN_ICON: Record<HomeTabName, { ios: SymbolName; android: IoniconName }> = {
  '(feed)': { ios: 'newspaper', android: 'newspaper-outline' },
  '(create-post)': { ios: 'plus.app', android: 'add-circle-outline' },
  '(match)': { ios: 'heart', android: 'heart-outline' },
  '(profile)': { ios: 'person', android: 'person-outline' },
  '(discover)': { ios: 'safari', android: 'compass-outline' },
}

function DockIcon({
  iosName,
  androidName,
  size,
  color,
}: {
  iosName: SymbolName
  androidName: IoniconName
  size: number
  color: string
}) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={iosName} size={size} tintColor={color} />
  }
  return <Ionicons name={androidName} size={size} color={color} />
}

function getActiveHomeTab(segments: string[]): HomeTabName {
  const homeIndex = segments.indexOf('(home)')
  const candidate = homeIndex === -1 ? null : segments[homeIndex + 1]
  if (candidate && candidate in HOME_TAB_LABELS) {
    return candidate as HomeTabName
  }
  return '(feed)'
}

function isDiscoverRootRoute(segments: string[]): boolean {
  const homeIndex = segments.indexOf('(home)')
  return homeIndex !== -1 && segments[homeIndex + 1] === '(discover)' && segments.length === homeIndex + 2
}

function internalRouteFromSegments(segments: string[]): string {
  if (segments.length === 0) return '/'
  return `/${segments.join('/')}`
}

function DiscoverLiquidSearchDock({
  returnTab,
  onReturnToRememberedTab,
  progress,
  isOverlayActive,
}: {
  returnTab: HomeTabName
  onReturnToRememberedTab: () => void
  progress: Animated.Value
  isOverlayActive: boolean
}) {
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const keyboardTransition = useRef(new Animated.Value(isOverlayActive ? 1 : 0)).current
  const keyboardLift = useRef(new Animated.Value(0)).current
  const isKeyboardOpen = keyboardHeight > 0
  const isDockActive = isKeyboardOpen || isOverlayActive
  const returnIcon = HOME_TAB_RETURN_ICON[returnTab]
  const returnLabel = HOME_TAB_LABELS[returnTab]
  const canUseLiquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable()
  const closeIcon = { ios: 'xmark' as SymbolName, android: 'close' as IoniconName }
  const buildOverlayRoute = (value: string) => {
    const normalized = value.trim()
    const querySuffix = normalized.length > 0
      ? `&q=${encodeURIComponent(normalized)}`
      : ''
    return `/(home)/(discover)?search=1${querySuffix}`
  }

  const openSearchOverlay = () => {
    router.replace(buildOverlayRoute(query) as any)
  }
  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (isOverlayActive) {
      router.replace(buildOverlayRoute(value) as any)
    }
  }
  const closeOverlayAndKeyboard = () => {
    Keyboard.dismiss()
    router.replace('/(home)/(discover)' as any)
  }
  const handleActionPress = () => {
    if (isOverlayActive) {
      closeOverlayAndKeyboard()
      return
    }
    if (isKeyboardOpen) {
      Keyboard.dismiss()
      return
    }
    onReturnToRememberedTab()
  }
  const actionAccessibilityLabel = isOverlayActive
    ? 'Close search overlay and keyboard'
    : isKeyboardOpen
      ? 'Close keyboard'
      : `Go to ${returnLabel}`

  const returnSize = 62
  const gap = 10
  const rowWidth = Math.max(0, windowWidth - 28)
  const expandedSearchWidth = Math.max(returnSize, rowWidth - returnSize - gap)
  const searchWidth = expandedSearchWidth
  const dockEnterTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
    extrapolate: 'clamp',
  })
  const actionTranslateX = keyboardTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, expandedSearchWidth + gap],
    extrapolate: 'clamp',
  })
  const searchTranslateX = keyboardTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(returnSize + gap)],
    extrapolate: 'clamp',
  })
  const previousIconOpacity = keyboardTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  })
  const closeIconOpacity = keyboardTransition
  const baseBottom = Platform.OS === 'ios'
    ? Math.max(10, insets.bottom - 14)
    : 12
  const liftTranslateY = Animated.multiply(keyboardLift, -1)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const frameEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : null

    const animateDockForKeyboard = (targetHeight: number, event?: RNKeyboardEvent) => {
      const duration = event?.duration && event.duration > 0
        ? event.duration
        : Platform.OS === 'ios'
          ? 250
          : 180

      setKeyboardHeight(targetHeight)
      Animated.timing(keyboardLift, {
        toValue: targetHeight > 0 ? targetHeight + 10 : 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    }

    const handleKeyboardShow = (event: RNKeyboardEvent) => {
      animateDockForKeyboard(event.endCoordinates.height, event)
    }

    const showSub = Keyboard.addListener(showEvent, handleKeyboardShow)
    const hideSub = Keyboard.addListener(hideEvent, () => {
      animateDockForKeyboard(0)
    })
    const frameSub = frameEvent
      ? Keyboard.addListener(frameEvent, handleKeyboardShow)
      : null

    return () => {
      showSub.remove()
      hideSub.remove()
      frameSub?.remove()
    }
  }, [keyboardLift])

  useEffect(() => {
    Animated.timing(keyboardTransition, {
      toValue: isDockActive ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [isDockActive, keyboardTransition])

  const dockHostStyle = [
    styles.discoverSearchHost,
    {
      bottom: baseBottom,
      transform: [{ translateY: Animated.add(liftTranslateY, dockEnterTranslateY) }],
    },
  ]

  return (
    <Animated.View pointerEvents="box-none" style={dockHostStyle}>
      <View style={styles.discoverSearchRow}>
        <Animated.View style={[styles.returnSurfaceTouch, { transform: [{ translateX: actionTranslateX }] }]}>
          <Pressable
            style={styles.returnPressable}
            onPress={handleActionPress}
            accessibilityLabel={actionAccessibilityLabel}
          >
            {canUseLiquidGlass ? (
              <GlassView isInteractive style={styles.returnSurface}>
                <View pointerEvents="none" style={styles.surfaceTint} />
                <View pointerEvents="none" style={styles.returnButton}>
                  <Animated.View pointerEvents="none" style={[styles.returnIconLayer, { opacity: previousIconOpacity }]}>
                    <DockIcon
                      iosName={returnIcon.ios}
                      androidName={returnIcon.android}
                      size={28}
                      color={Colors.onSurface}
                    />
                  </Animated.View>
                  <Animated.View pointerEvents="none" style={[styles.returnIconLayer, { opacity: closeIconOpacity }]}>
                    <DockIcon
                      iosName={closeIcon.ios}
                      androidName={closeIcon.android}
                      size={28}
                      color={Colors.onSurface}
                    />
                  </Animated.View>
                </View>
              </GlassView>
            ) : (
              <BlurView tint="systemMaterial" intensity={88} style={[styles.returnSurface, styles.discoverSearchFallback]}>
                <View pointerEvents="none" style={styles.surfaceTint} />
                <View pointerEvents="none" style={styles.returnButton}>
                  <Animated.View pointerEvents="none" style={[styles.returnIconLayer, { opacity: previousIconOpacity }]}>
                    <DockIcon
                      iosName={returnIcon.ios}
                      androidName={returnIcon.android}
                      size={28}
                      color={Colors.onSurface}
                    />
                  </Animated.View>
                  <Animated.View pointerEvents="none" style={[styles.returnIconLayer, { opacity: closeIconOpacity }]}>
                    <DockIcon
                      iosName={closeIcon.ios}
                      androidName={closeIcon.android}
                      size={28}
                      color={Colors.onSurface}
                    />
                  </Animated.View>
                </View>
              </BlurView>
            )}
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.searchRail, { transform: [{ translateX: searchTranslateX }] }]}>
          <Animated.View style={[styles.searchSurfaceWrapper, { width: searchWidth }]}>
            {canUseLiquidGlass ? (
              <GlassView isInteractive style={styles.searchSurface}>
                <View pointerEvents="none" style={styles.surfaceTint} />
                <View style={styles.searchInputWrap}>
                  <DockIcon
                    iosName="safari"
                    androidName="compass-outline"
                    size={20}
                    color="#000000"
                  />
                  <TextInput
                    value={query}
                    onChangeText={handleQueryChange}
                    style={styles.searchInput}
                    placeholder="Search artists, songs, albums"
                    placeholderTextColor="#000000"
                    returnKeyType="search"
                    autoCorrect={false}
                    onFocus={openSearchOverlay}
                    onSubmitEditing={openSearchOverlay}
                  />
                  {query.length > 0 && !isOverlayActive ? (
                    <Pressable
                      onPress={() => setQuery('')}
                      hitSlop={8}
                      accessibilityLabel="Clear search"
                    >
                      <DockIcon
                        iosName="xmark.circle.fill"
                        androidName="close-circle"
                        size={20}
                        color={Colors.outline}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </GlassView>
            ) : (
              <BlurView tint="systemMaterial" intensity={88} style={[styles.searchSurface, styles.discoverSearchFallback]}>
                <View pointerEvents="none" style={styles.surfaceTint} />
                <View style={styles.searchInputWrap}>
                  <DockIcon
                    iosName="safari"
                    androidName="compass-outline"
                    size={20}
                    color="#000000"
                  />
                  <TextInput
                    value={query}
                    onChangeText={handleQueryChange}
                    style={styles.searchInput}
                    placeholder="Search artists, songs, albums"
                    placeholderTextColor="#000000"
                    returnKeyType="search"
                    autoCorrect={false}
                    onFocus={openSearchOverlay}
                    onSubmitEditing={openSearchOverlay}
                  />
                  {query.length > 0 && !isOverlayActive ? (
                    <Pressable
                      onPress={() => setQuery('')}
                      hitSlop={8}
                      accessibilityLabel="Clear search"
                    >
                      <DockIcon
                        iosName="xmark.circle.fill"
                        androidName="close-circle"
                        size={20}
                        color={Colors.outline}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </BlurView>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  )
}

export default function HomeLayout() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const segments = useSegments()
  const searchParams = useGlobalSearchParams<{ search?: string | string[] }>()
  const activeHomeTab = getActiveHomeTab(segments)
  const discoverRootRoute = isDiscoverRootRoute(segments)
  const discoverSearchParam = searchParams.search
  const isSearchOverlayOpen = discoverRootRoute && (
    Array.isArray(discoverSearchParam)
      ? discoverSearchParam.includes('1')
      : discoverSearchParam === '1'
  )
  const [rememberedHomeTab, setRememberedHomeTab] = useState<HomeTabName>('(feed)')
  const [rememberedRoute, setRememberedRoute] = useState<string>(HOME_TAB_ROUTE['(feed)'])

  const isChatThreadRoute =
    segments[0] === '(home)'
    && segments[1] === '(match)'
    && segments[2] === 'chat'
    && segments.length > 3

  const isPostDetailRoute =
    segments[0] === '(home)'
    && (segments[1] === '(feed)' || segments[1] === '(discover)' || segments[1] === '(profile)')
    && segments[2] === 'post'
    && segments.length > 3

  useEffect(() => {
    if (activeHomeTab !== '(discover)') {
      setRememberedHomeTab(activeHomeTab)
      setRememberedRoute(internalRouteFromSegments(segments))
    }
  }, [activeHomeTab, segments])

  const shouldShowDiscoverSearchDock = discoverRootRoute
  const dockProgress = useRef(new Animated.Value(shouldShowDiscoverSearchDock ? 1 : 0)).current
  const dockAnimationIdRef = useRef(0)
  const dockAnimationRef = useRef<Animated.CompositeAnimation | null>(null)
  const [isDockMounted, setIsDockMounted] = useState(shouldShowDiscoverSearchDock)

  useEffect(() => {
    dockAnimationIdRef.current += 1
    const animationId = dockAnimationIdRef.current
    dockAnimationRef.current?.stop()
    dockProgress.stopAnimation()

    if (shouldShowDiscoverSearchDock) {
      setIsDockMounted(true)
      dockAnimationRef.current = Animated.timing(dockProgress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
      dockAnimationRef.current.start()
      return
    }

    dockAnimationRef.current = Animated.timing(dockProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    })
    dockAnimationRef.current.start(({ finished }) => {
      if (finished && animationId === dockAnimationIdRef.current) {
        setIsDockMounted(false)
      }
    })
  }, [dockProgress, shouldShowDiscoverSearchDock])

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return <FullscreenSpinner />
  }

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />

  if (!isAccountSetupComplete(user)) return <Redirect href="/complete-profile" />

  return (
    <ChatProvider>
      <View style={styles.root}>
        <NativeTabs
          hidden={isChatThreadRoute || isPostDetailRoute || shouldShowDiscoverSearchDock || isDockMounted}
          tintColor={Colors.primary}
          iconColor={{ default: Colors.onSurfaceVariant, selected: Colors.primary }}
          labelStyle={{
            default: { color: Colors.onSurfaceVariant },
            selected: { color: Colors.primary },
          }}
          backgroundColor={Platform.OS === 'android' ? Colors.surfaceContainerLowest : undefined}
          blurEffect="systemUltraThinMaterial"
          disableTransparentOnScrollEdge
          minimizeBehavior="onScrollDown"
        >
          <NativeTabs.Trigger
            name="(feed)"
            disablePopToTop
            disableScrollToTop
          >
            <NativeTabs.Trigger.Label>{HOME_TAB_LABELS['(feed)']}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: 'newspaper', selected: 'newspaper.fill' }}
              md="newspaper"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger
            name="(create-post)"
          >
            <NativeTabs.Trigger.Label>{HOME_TAB_LABELS['(create-post)']}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: 'plus.app', selected: 'plus.app.fill' }}
              md="add_circle"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger
            name="(match)"
            disablePopToTop
            disableScrollToTop
          >
            <NativeTabs.Trigger.Label>{HOME_TAB_LABELS['(match)']}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: 'heart', selected: 'heart.fill' }}
              md="favorite"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger
            name="(profile)"
            disablePopToTop
            disableScrollToTop
          >
            <NativeTabs.Trigger.Label>{HOME_TAB_LABELS['(profile)']}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: 'person', selected: 'person.fill' }}
              md="person"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger
            name="(discover)"
            role="search"
            disablePopToTop
            disableScrollToTop
          >
            <NativeTabs.Trigger.Label>{HOME_TAB_LABELS['(discover)']}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: 'safari', selected: 'safari.fill' }}
              md="explore"
            />
          </NativeTabs.Trigger>
        </NativeTabs>

        {isDockMounted && !isChatThreadRoute ? (
          <DiscoverLiquidSearchDock
            returnTab={rememberedHomeTab}
            progress={dockProgress}
            isOverlayActive={isSearchOverlayOpen}
            onReturnToRememberedTab={() => {
              const targetRoute = rememberedRoute.includes('/(discover)')
                ? HOME_TAB_ROUTE[rememberedHomeTab]
                : rememberedRoute
              requestAnimationFrame(() => {
                router.push(targetRoute as any)
              })
            }}
          />
        ) : null}
      </View>
    </ChatProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  discoverSearchHost: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 30,
  },
  discoverSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  returnSurface: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  returnSurfaceTouch: {
    width: 62,
    height: 62,
    borderRadius: 999,
    overflow: 'hidden',
  },
  returnPressable: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  searchSurfaceWrapper: {
    height: 62,
  },
  searchRail: {
    flex: 1,
    alignItems: 'flex-end',
  },
  searchSurface: {
    width: '100%',
    height: 62,
    borderRadius: 999,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  discoverSearchFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  surfaceTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: `${Colors.primary}26`,
  },
  returnButton: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnIconLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.onSurface,
    padding: 0,
  },
})
