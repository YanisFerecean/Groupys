import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { BlurView } from 'expo-blur'
import { Redirect, Tabs } from 'expo-router'
import { StyleSheet } from 'react-native'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { Colors } from '@/constants/colors'
import { hasUsername } from '@/lib/auth'

export default function HomeLayout() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return <FullscreenSpinner />
  }

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />

  if (!hasUsername(user)) return <Redirect href="/complete-profile" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
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
  )
}
