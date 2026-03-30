import { useAuth, useSignUp } from '@clerk/expo'
import { Redirect, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import AuthScaffold from '@/components/auth/AuthScaffold'
import AuthTextField from '@/components/auth/AuthTextField'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { Colors } from '@/constants/colors'
import { normalizeUsername, validateUsername } from '@/lib/auth'
import { getClerkErrorMessage } from '@/lib/clerk'

export default function SSOContinueScreen() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { signUp, setActive, fetchStatus } = useSignUp()

  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isBusy = fetchStatus === 'fetching'
  const missingFields = useMemo(() => signUp.missingFields ?? [], [signUp.missingFields])
  const needsUsername =
    signUp.status === 'missing_requirements' && missingFields.includes('username')

  if (isSignedIn || signUp.status === 'complete') {
    return <FullscreenSpinner />
  }

  if (!needsUsername) {
    return <Redirect href="/(auth)/sign-in" />
  }

  async function activateCreatedSessionId() {
    if (!signUp.createdSessionId || !setActive) {
      return false
    }

    await setActive({ session: signUp.createdSessionId })
    return true
  }

  async function safeReloadSignUpState() {
    if (typeof signUp.reload !== 'function') {
      return
    }

    try {
      await signUp.reload()
    } catch (reloadError) {
      console.warn('Could not reload sign-up state', reloadError)
    }
  }

  function isTransientParseError(message: string | null | undefined) {
    if (!message) return false
    const normalized = message.toLowerCase()
    return (
      normalized.includes('json parse error') ||
      normalized.includes('unexpected end of input')
    )
  }

  async function handleContinue() {
    const normalizedUsername = normalizeUsername(username)
    const usernameError = validateUsername(normalizedUsername)

    if (usernameError) {
      setError(usernameError)
      return
    }

    setError(null)

    try {
      const { error: updateError } = await signUp.update({
        username: normalizedUsername,
      })

      if (updateError) {
        const updateMessage = getClerkErrorMessage(updateError, 'We could not update your username.')
        if (isTransientParseError(updateMessage)) {
          console.warn('Username update returned transient parse error', {
            updateMessage,
            status: signUp.status,
            missingFields: signUp.missingFields,
          })
          await safeReloadSignUpState()
        } else {
          setError(updateMessage)
          return
        }
      }
    } catch (updateThrownError) {
      console.warn('Username update threw unexpectedly', updateThrownError)
      await safeReloadSignUpState()
    }

    if (await activateCreatedSessionId()) {
      return
    }

    try {
      const { error: finalizeError } = await signUp.finalize()

      if (finalizeError) {
        const finalizeMessage = getClerkErrorMessage(finalizeError, 'We could not finish your sign up.')
        if (isTransientParseError(finalizeMessage)) {
          console.warn('Sign-up finalize returned transient parse error', {
            finalizeMessage,
            status: signUp.status,
            missingFields: signUp.missingFields,
            createdSessionId: signUp.createdSessionId,
          })
          await safeReloadSignUpState()
        } else {
          setError(finalizeMessage)
          return
        }
      }
    } catch (finalizeThrownError) {
      console.warn('Sign-up finalize threw unexpectedly', finalizeThrownError)
      await safeReloadSignUpState()
    }

    if (await activateCreatedSessionId()) {
      return
    }

    if (signUp.status !== 'complete') {
      const remainingFields = signUp.missingFields?.join(', ')
      setError(
        remainingFields
          ? `More information is still required: ${remainingFields}.`
          : 'Your sign up needs additional steps before completion.',
      )
      return
    }
  }

  async function handleStartOver() {
    await signUp.reset()
    setError(null)
    setUsername('')
    router.replace('/(auth)/sign-up')
  }

  return (
    <AuthScaffold
      title="Finish sign up"
      subtitle="Google sign-in worked. Choose a username to finish creating your Groupys account."
      footer={
        <View className="items-center">
          <Text className="text-sm text-on-surface-variant">
            This username will be public on your profile.
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
        disabled={isBusy}
      >
        {isBusy ? (
          <ActivityIndicator color={Colors.onPrimary} />
        ) : (
          <Text className="text-base font-semibold text-on-primary">Continue</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center py-2"
        onPress={handleStartOver}
        disabled={isBusy}
      >
        <Text className="text-sm font-semibold text-primary">Start over</Text>
      </TouchableOpacity>

      <View nativeID="clerk-captcha" />
    </AuthScaffold>
  )
}
