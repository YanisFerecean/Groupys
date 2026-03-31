import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { BlurView } from 'expo-blur'
import { Redirect, Tabs, router, useSegments } from 'expo-router'
import { useCallback, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { ChatProvider } from '@/components/chat/ChatProvider'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { Colors } from '@/constants/colors'
import { isAccountSetupComplete } from '@/lib/auth'
import { homeTabRootPath, type HomeTab } from '@/lib/profileRoutes'

const DOUBLE_TAP_DELAY_MS = 320

export default function HomeLayout() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()
  const segments = useSegments()
  const lastTabPressRef = useRef<{ tab: HomeTab | null; at: number }>({ tab: null, at: 0 })
  const isChatThreadRoute =
    segments[0] === '(home)'
    && segments[1] === '(match)'
    && segments[2] === 'chat'
    && segments.length > 3

  const handleTabPress = useCallback((tab: HomeTab) => {
    const now = Date.now()
    const lastPress = lastTabPressRef.current
    const isDoubleTap = lastPress.tab === tab && now - lastPress.at <= DOUBLE_TAP_DELAY_MS

    lastTabPressRef.current = { tab, at: now }

    if (isDoubleTap) {
      requestAnimationFrame(() => {
        router.replace(homeTabRootPath(tab) as never)
      })
    }
  }, [])

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return <FullscreenSpinner />
  }

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />

  if (!isAccountSetupComplete(user)) return <Redirect href="/complete-profile" />

  return (
    <ChatProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: 'shift',
          tabBarShowLabel: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.onSurfaceVariant,
          tabBarStyle: isChatThreadRoute
            ? { display: 'none' }
            : {
                position: 'absolute',
                borderTopWidth: 0,
                elevation: 0,
                backgroundColor: 'transparent',
              },
          tabBarBackground: () => (
            isChatThreadRoute
              ? null
              : (
                  <BlurView
                    intensity={80}
                    tint="light"
                    style={StyleSheet.absoluteFill}
                  />
                )
          ),
        }}
      >
        <Tabs.Screen
          name="(feed)"
          listeners={{
            tabPress: () => handleTabPress('(feed)'),
          }}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="newspaper-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(discover)"
          listeners={{
            tabPress: () => handleTabPress('(discover)'),
          }}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="compass-outline" size={size} color={color} />
            ),
          }}
        />
          <Tabs.Screen
              name="create-post"
              options={{
                  tabBarStyle: { display: 'none' },
                  tabBarIcon: ({ color, size }) => (
                      <View style={{
                          backgroundColor: Colors.primary,
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 4,
                      }}>
                          <Ionicons name="add" size={32} color="#fff" />
                      </View>
                  ),
              }}
          />
        <Tabs.Screen
          name="(match)"
          listeners={{
            tabPress: () => handleTabPress('(match)'),
          }}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="(profile)"
          listeners={{
            tabPress: () => handleTabPress('(profile)'),
          }}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </ChatProvider>
  )
}
