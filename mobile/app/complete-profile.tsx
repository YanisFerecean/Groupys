import { useAuth, useUser } from '@clerk/expo'
import { Redirect, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import AuthScaffold from '@/components/auth/AuthScaffold'
import AuthTextField from '@/components/auth/AuthTextField'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { Colors } from '@/constants/colors'
import { hasUsername, normalizeUsername, validateUsername } from '@/lib/auth'
import { getClerkErrorMessage } from '@/lib/clerk'

export default function CompleteProfileScreen() {
  const router = useRouter()
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [didPrefill, setDidPrefill] = useState(false)

  useEffect(() => {
    if (didPrefill) return

    const seededUsername = normalizeUsername(user?.username)
    if (!seededUsername) return

    setUsername(seededUsername)
    setDidPrefill(true)
  }, [didPrefill, user?.username])

  if (!isAuthLoaded || !isUserLoaded) {
    return <FullscreenSpinner />
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  if (hasUsername(user)) {
    return <Redirect href="/(home)/(feed)" />
  }

  async function handleContinue() {
    const normalizedUsername = normalizeUsername(username)
    const usernameError = validateUsername(normalizedUsername)

    if (usernameError) {
      setError(usernameError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!user) {
        setError('Your account is not ready yet. Please try again.')
        return
      }

      await user.update({ username: normalizedUsername })
      router.replace('/(home)/(feed)')
    } catch (error) {
      const message = getClerkErrorMessage(error, 'Could not save your username. Please try again.')

      if (message.toLowerCase().includes('username')) {
        setError('That username is already taken. Please choose a different one.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScaffold
      title="Choose a username"
      subtitle="Your profile and backend record still need a public handle before you can enter the app."
      footer={
        <View className="items-center">
          <Text className="text-sm text-on-surface-variant">
            Signed in as{' '}
            <Text className="font-semibold text-on-surface">{user?.primaryEmailAddress?.emailAddress ?? 'your account'}</Text>
          </Text>
        </View>
      }
    >
      {error ? (
        <View className="mb-5 rounded-2xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-600">{error}</Text>
        </View>
      ) : null}

      <AuthTextField
        label="Username"
        error={null}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username-new"
        textContentType="username"
        autoFocus
        placeholder="your public handle"
      />

      <TouchableOpacity
        className="mt-2 items-center rounded-2xl bg-primary py-4 active:opacity-90"
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.onPrimary} />
        ) : (
          <Text className="text-base font-semibold text-on-primary">Save username</Text>
        )}
      </TouchableOpacity>
    </AuthScaffold>
  )
}
