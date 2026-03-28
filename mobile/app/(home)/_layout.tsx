import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { BlurView } from 'expo-blur'
import { Redirect, Tabs, useSegments } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { ChatProvider } from '@/components/chat/ChatProvider'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { Colors } from '@/constants/colors'
import { hasUsername } from '@/lib/auth'

export default function HomeLayout() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()
  const segments = useSegments()
  const isChatThreadRoute =
    segments[0] === '(home)'
    && segments[1] === '(match)'
    && segments[2] === 'chat'
    && segments.length > 3

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return <FullscreenSpinner />
  }

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />

  if (!hasUsername(user)) return <Redirect href="/complete-profile" />

  return (
    <ChatProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
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
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="newspaper-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(discover)"
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
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="(profile)"
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
