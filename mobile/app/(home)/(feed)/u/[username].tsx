import PublicProfileScreen from '@/components/profile/PublicProfileScreen'
import { Colors } from '@/constants/colors'
import { useAuthToken } from '@/hooks/useAuthToken'
import { fetchUserByUsername } from '@/lib/api'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'

/**
 * Deep-link landing for profile share links (`/profile/{username}` → here via +native-intent).
 * Share links carry a username, but PublicProfileScreen routes by backend userId, so resolve it.
 */
export default function ProfileByUsernameRoute() {
  const params = useLocalSearchParams<{ username?: string | string[] }>()
  const username = Array.isArray(params.username) ? params.username[0] : params.username
  const { refreshToken } = useAuthToken()
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading')

  useEffect(() => {
    let cancelled = false
    if (!username) {
      setStatus('notfound')
      return
    }
    setStatus('loading')
    ;(async () => {
      try {
        const token = await refreshToken()
        const resolved = await fetchUserByUsername(username, token)
        if (cancelled) return
        if (resolved?.id) {
          setUserId(resolved.id)
          setStatus('ready')
        } else {
          setStatus('notfound')
        }
      } catch {
        if (!cancelled) setStatus('notfound')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshToken, username])

  if (status === 'ready' && userId) {
    return <PublicProfileScreen userId={userId} />
  }

  if (status === 'notfound') {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-10">
        <Ionicons name="person-circle-outline" size={44} color={Colors.onSurfaceVariant} />
        <Text className="mt-4 text-lg font-bold text-on-surface">Profile unavailable</Text>
        <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
          {username ? `We couldn't find @${username}.` : 'This profile link is invalid.'}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-full bg-primary px-6 py-3"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(home)/(feed)'))}
        >
          <Text className="text-sm font-bold text-on-primary">Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <ActivityIndicator color={Colors.primary} />
    </View>
  )
}
