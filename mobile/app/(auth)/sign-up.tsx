import { useAuth, useSignUp } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import AuthScaffold from '@/components/auth/AuthScaffold'
import AuthTextField from '@/components/auth/AuthTextField'
import SSOButtons from '@/components/auth/SSOButtons'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { Colors } from '@/constants/colors'
import {
  normalizeEmailAddress,
  normalizeUsername,
  validateEmailAddress,
  validatePassword,
  validateUsername,
} from '@/lib/auth'
import { getClerkErrorMessage, getFirstErrorMessage } from '@/lib/clerk'

type SignUpLocalErrors = {
  code?: string | null
  emailAddress?: string | null
  password?: string | null
  username?: string | null
}

export default function SignUpScreen() {
  const router = useRouter()
  const { signUp, errors, fetchStatus } = useSignUp()
  const { isSignedIn } = useAuth()

  const [emailAddress, setEmailAddress] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [localErrors, setLocalErrors] = useState<SignUpLocalErrors>({})

  const isBusy = fetchStatus === 'fetching'
  const isVerifyingEmail =
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0

  const emailError = localErrors.emailAddress ?? errors.fields.emailAddress?.message ?? null
  const usernameError = localErrors.username ?? errors.fields.username?.message ?? null
  const passwordError = localErrors.password ?? errors.fields.password?.message ?? null
  const codeError = localErrors.code ?? errors.fields.code?.message ?? null
  const globalError =
    formError ??
    getFirstErrorMessage(
      errors,
      isVerifyingEmail
        ? ['code', 'captcha']
        : ['emailAddress', 'username', 'password', 'captcha'],
      null,
    )

  if (signUp.status === 'complete' || isSignedIn) {
    return <FullscreenSpinner />
  }

  async function finalizeSignUp() {
    try {
      const { error } = await signUp.finalize()

      if (error) {
        setFormError(getClerkErrorMessage(error, 'We could not finish creating your account.'))
      }
    } catch (err) {
      setFormError(getClerkErrorMessage(err, 'We could not finish creating your account.'))
    }
  }

  async function handleSubmit() {
    const nextErrors: SignUpLocalErrors = {
      emailAddress: validateEmailAddress(emailAddress),
      username: validateUsername(normalizeUsername(username)),
      password: validatePassword(password),
      code: null,
    }

    setLocalErrors(nextErrors)
    setFormError(null)

    if (nextErrors.emailAddress || nextErrors.username || nextErrors.password) {
      return
    }

    const { error } = await signUp.password({
      emailAddress: normalizeEmailAddress(emailAddress),
      username: normalizeUsername(username),
      password,
    })

    if (error) {
      setFormError(getClerkErrorMessage(error, 'We could not start your sign-up.'))
      return
    }

    const { error: sendCodeError } = await signUp.verifications.sendEmailCode()

    if (sendCodeError) {
      setFormError(getClerkErrorMessage(sendCodeError, 'We could not send a verification code.'))
    }
  }

  async function handleVerify() {
    const nextError = code.trim() ? null : 'Verification code is required.'

    setLocalErrors((current) => ({
      ...current,
      code: nextError,
    }))
    setFormError(null)

    if (nextError) {
      return
    }

    const { error } = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    })

    if (error) {
      setFormError(getClerkErrorMessage(error, 'We could not verify your email.'))
      return
    }

    if (signUp.status === 'complete') {
      await finalizeSignUp()
      return
    }

    setFormError('We could not finish verifying your email. Please try again.')
  }

  async function handleResendCode() {
    setFormError(null)

    const { error } = await signUp.verifications.sendEmailCode()

    if (error) {
      setFormError(getClerkErrorMessage(error, 'We could not send a new verification code.'))
    }
  }

  async function handleStartOver() {
    await signUp.reset()
    setCode('')
    setFormError(null)
    setLocalErrors({})
  }

  return (
    <AuthScaffold
      title={isVerifyingEmail ? 'Verify email' : 'Create account'}
      subtitle={
        isVerifyingEmail
          ? 'Enter the code Clerk emailed you to activate your account and open a session.'
          : 'Start with email and password, then lock in the public username your profile will use.'
      }
      footer={
        <View className="items-center">
          <Text className="text-sm text-on-surface-variant">
            Already have an account?{' '}
            <Text className="font-semibold text-primary" onPress={() => router.push('/sign-in')}>
              Sign in
            </Text>
          </Text>
        </View>
      }
    >
      {!isVerifyingEmail ? (
        <>
          <SSOButtons mode="sign-up" />

          <View className="my-5 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-outline-variant" />
            <Text className="text-xs font-medium text-on-surface-variant">OR</Text>
            <View className="h-px flex-1 bg-outline-variant" />
          </View>
        </>
      ) : null}

      {globalError ? (
        <View className="mb-5 rounded-2xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-600">{globalError}</Text>
        </View>
      ) : null}

      {isVerifyingEmail ? (
        <>
          <AuthTextField
            label="Verification code"
            error={codeError}
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoComplete="one-time-code"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            placeholder="Enter the code from your email"
          />

          <TouchableOpacity
            className="mt-2 items-center rounded-2xl bg-primary py-4 active:opacity-90"
            onPress={handleVerify}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text className="text-base font-semibold text-on-primary">Verify and continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-3 items-center rounded-2xl bg-surface-container-high py-4 active:opacity-90"
            onPress={handleResendCode}
            disabled={isBusy}
          >
            <Text className="text-base font-semibold text-on-surface">Send a new code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4 items-center py-2"
            onPress={handleStartOver}
            disabled={isBusy}
          >
            <Text className="text-sm font-semibold text-primary">Start over</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <AuthTextField
            label="Email address"
            error={emailError}
            value={emailAddress}
            onChangeText={setEmailAddress}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />

          <AuthTextField
            label="Username"
            error={usernameError}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username-new"
            textContentType="username"
            placeholder="your public handle"
          />

          <AuthTextField
            label="Password"
            error={passwordError}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="password-new"
            secureTextEntry
            textContentType="newPassword"
            placeholder="Create a strong password"
          />

          <TouchableOpacity
            className="mt-2 items-center rounded-2xl bg-primary py-4 active:opacity-90"
            onPress={handleSubmit}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text className="text-base font-semibold text-on-primary">Create account</Text>
            )}
          </TouchableOpacity>

          <View nativeID="clerk-captcha" />
        </>
      )}
    </AuthScaffold>
  )
}
