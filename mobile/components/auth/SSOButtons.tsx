import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSSO } from '@clerk/expo'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Colors } from '@/constants/colors'

WebBrowser.maybeCompleteAuthSession()

type Strategy = 'oauth_google' | 'oauth_apple' | 'oauth_spotify'

interface SSOButtonsProps {
  onError?: (message: string) => void
}

export default function SSOButtons({ onError }: SSOButtonsProps) {
  const { startSSOFlow } = useSSO()
  const [loadingProvider, setLoadingProvider] = useState<Strategy | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'web') {
      void WebBrowser.warmUpAsync()
      return () => {
        void WebBrowser.coolDownAsync()
      }
    }
  }, [])

  const handleSSO = useCallback(
    async (strategy: Strategy) => {
      setLoadingProvider(strategy)
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        })

        if (createdSessionId) {
          await setActive!({ session: createdSessionId })
        }
      } catch (err: any) {
        const message =
          err?.errors?.[0]?.longMessage ??
          err?.errors?.[0]?.message ??
          'Authentication failed. Please try again.'
        onError?.(message)
      } finally {
        setLoadingProvider(null)
      }
    },
    [startSSOFlow, onError],
  )

  const disabled = loadingProvider !== null

  return (
    <View className="gap-3">
      {/* Google */}
      <TouchableOpacity
        className="flex-row items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3.5 active:bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
        onPress={() => handleSSO('oauth_google')}
        disabled={disabled}
      >
        {loadingProvider === 'oauth_google' ? (
          <ActivityIndicator size="small" color={Colors.onSurface} />
        ) : (
          <GoogleIcon />
        )}
        <Text className="text-base font-medium text-gray-900 dark:text-white">
          Continue with Google
        </Text>
      </TouchableOpacity>

      {/* Apple */}
      <TouchableOpacity
        className="flex-row items-center justify-center gap-3 rounded-xl bg-black py-3.5 active:opacity-90 dark:bg-white"
        onPress={() => handleSSO('oauth_apple')}
        disabled={disabled}
      >
        {loadingProvider === 'oauth_apple' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="logo-apple" size={20} color={Platform.OS === 'web' ? '#fff' : '#fff'} />
        )}
        <Text className="text-base font-medium text-white dark:text-black">
          Continue with Apple
        </Text>
      </TouchableOpacity>

      {/* Spotify */}
      <TouchableOpacity
        className="flex-row items-center justify-center gap-3 rounded-xl py-3.5 active:opacity-90"
        style={{ backgroundColor: '#1DB954' }}
        onPress={() => handleSSO('oauth_spotify')}
        disabled={disabled}
      >
        {loadingProvider === 'oauth_spotify' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <MaterialCommunityIcons name="spotify" size={20} color="#fff" />
        )}
        <Text className="text-base font-medium text-white">
          Continue with Spotify
        </Text>
      </TouchableOpacity>

    </View>
  )
}

function GoogleIcon() {
  return <Ionicons name="logo-google" size={20} color="#4285F4" />
}
