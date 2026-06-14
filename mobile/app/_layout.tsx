import '@/global.css'
import { useEffect } from 'react'
import { Appearance } from 'react-native'
import { ClerkProvider } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { Slot } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthTokenProvider } from '@/hooks/AuthTokenContext'
import { QueryProvider } from '@/components/QueryProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans'

SplashScreen.preventAutoHideAsync()

// The app ships light-only. Pin the native interface style at runtime so dynamic
// surfaces (Liquid Glass / GlassView, system-material BlurViews, presented modals)
// don't follow the device's dark-mode setting.
Appearance.setColorScheme('light')

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file')
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <AuthTokenProvider>
            <QueryProvider>
              <ErrorBoundary>
                <Slot />
              </ErrorBoundary>
            </QueryProvider>
          </AuthTokenProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
