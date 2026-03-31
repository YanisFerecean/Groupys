import { useAuth, useUser } from '@clerk/expo'
import { Redirect, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import AuthScaffold from '@/components/auth/AuthScaffold'
import AuthTextField from '@/components/auth/AuthTextField'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { Colors } from '@/constants/colors'
import { fetchUserByClerkId, upsertBackendUserIdentity } from '@/lib/api'
import {
  getUserDisplayName,
  isAccountSetupComplete,
  normalizeDisplayName,
  normalizeUsername,
  validateDisplayName,
  validateUsername,
} from '@/lib/auth'
import { getClerkErrorMessage } from '@/lib/clerk'

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/)
  const firstName = parts[0] ?? ''
  const lastName = parts.slice(1).join(' ') || null

  return { firstName, lastName }
}

export default function CompleteProfileScreen() {
  const router = useRouter()
  const { isSignedIn, isLoaded: isAuthLoaded, getToken } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [didPrefillFromClerk, setDidPrefillFromClerk] = useState(false)
  const didTryBackendPrefill = useRef(false)

  useEffect(() => {
    if (didPrefillFromClerk || !user) {
      return
    }

    setDisplayName(normalizeDisplayName(getUserDisplayName(user)))
    setUsername(normalizeUsername(user.username))
    setDidPrefillFromClerk(true)
  }, [didPrefillFromClerk, user])

  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded || !isSignedIn || !user || didTryBackendPrefill.current) {
      return
    }

    didTryBackendPrefill.current = true
    let cancelled = false

    ;(async () => {
      try {
        const token = await getToken()
        const backendUser = await fetchUserByClerkId(user.id, token)

        if (!backendUser || cancelled) {
          return
        }

        const backendDisplayName = normalizeDisplayName(backendUser.displayName)
        const backendUsername = normalizeUsername(backendUser.username)

        if (backendDisplayName) {
          setDisplayName((current) => current || backendDisplayName)
        }
        if (backendUsername) {
          setUsername((current) => current || backendUsername)
        }
      } catch (prefillError) {
        console.warn('Could not prefill backend onboarding fields', prefillError)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [getToken, isAuthLoaded, isSignedIn, isUserLoaded, user])

  if (!isAuthLoaded || !isUserLoaded) {
    return <FullscreenSpinner />
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  if (isAccountSetupComplete(user)) {
    return <Redirect href="/(home)/(feed)" />
  }

  async function handleContinue() {
    const normalizedDisplayName = normalizeDisplayName(displayName)
    const normalizedUsername = normalizeUsername(username)

    const displayNameError = validateDisplayName(normalizedDisplayName)
    if (displayNameError) {
      setError(displayNameError)
      return
    }

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

      const { firstName, lastName } = splitDisplayName(normalizedDisplayName)

      await user.update({
        username: normalizedUsername,
        firstName,
        lastName,
      })

      const token = await getToken()
      if (!token) {
        setError('Your session expired. Please sign in again.')
        return
      }

      await upsertBackendUserIdentity(
        {
          clerkId: user.id,
          username: normalizedUsername,
          displayName: normalizedDisplayName,
          profileImage: user.imageUrl ?? undefined,
        },
        token,
      )

      const currentMetadata = (user.unsafeMetadata ?? {}) as Record<string, unknown>

      await user.update({
        unsafeMetadata: {
          ...currentMetadata,
          onboarding_completed: true,
        },
      })

      try {
        await user.reload()
      } catch (reloadError) {
        console.warn('Clerk user reload failed after onboarding save', reloadError)
      }
      router.replace('/(home)/(feed)')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : ''
      const isBackendProfileWriteError =
        /Failed to (create|update) user(?: identity)? \(\d+\)/i.test(message) ||
        /Failed to fetch user \(\d+\)/i.test(message)

      if (isBackendProfileWriteError) {
        console.warn('Backend profile onboarding save failed', saveError)

        if (message.toLowerCase().includes('username') || message.includes('(409)')) {
          setError('That username is already taken in Groupys. Please choose a different one.')
          return
        }

        if (message.includes('(401)') || message.includes('(403)')) {
          setError('Your session expired. Please sign out and sign in again.')
          return
        }

        setError('Could not save your profile in Groupys yet. Please try again.')
        return
      }

      const clerkMessage = getClerkErrorMessage(saveError, 'Could not save your profile. Please try again.')

      if (clerkMessage.toLowerCase().includes('username')) {
        setError('That username is already taken. Please choose a different one.')
      } else {
        setError(clerkMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScaffold
      title="Complete your account"
      subtitle="Add your display name and username before entering Groupys."
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
        label="Display name"
        error={null}
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        autoFocus
        placeholder="How people will see your name"
      />

      <AuthTextField
        label="Username"
        error={null}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username-new"
        textContentType="username"
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
          <Text className="text-base font-semibold text-on-primary">Save and continue</Text>
        )}
      </TouchableOpacity>
    </AuthScaffold>
  )
}
