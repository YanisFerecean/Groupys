import { useSignIn } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import AuthScaffold from '@/components/auth/AuthScaffold'
import AuthTextField from '@/components/auth/AuthTextField'
import SSOButtons from '@/components/auth/SSOButtons'
import { Colors } from '@/constants/colors'
import { normalizeEmailAddress, validateEmailAddress, validatePassword } from '@/lib/auth'
import { getClerkErrorMessage, getFirstErrorMessage } from '@/lib/clerk'

type SignInLocalErrors = {
  code?: string | null
  identifier?: string | null
  password?: string | null
}

export default function SignInScreen() {
  const router = useRouter()
  const { signIn, errors, fetchStatus } = useSignIn()

  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [localErrors, setLocalErrors] = useState<SignInLocalErrors>({})

  const isBusy = fetchStatus === 'fetching'
  const supportsEmailCodeSecondFactor = signIn.supportedSecondFactors.some(
    (factor) => factor.strategy === 'email_code',
  )
  const needsVerification =
    signIn.status === 'needs_client_trust' ||
    (signIn.status === 'needs_second_factor' && supportsEmailCodeSecondFactor)

  const identifierError = localErrors.identifier ?? errors.fields.identifier?.message ?? null
  const passwordError = localErrors.password ?? errors.fields.password?.message ?? null
  const codeError = localErrors.code ?? errors.fields.code?.message ?? null
  const globalError =
    formError ??
    getFirstErrorMessage(errors, needsVerification ? ['code'] : ['identifier', 'password'], null)

  async function finalizeSignIn() {
    try {
      const { error } = await signIn.finalize()

      if (error) {
        setFormError(getClerkErrorMessage(error, 'We could not finish signing you in.'))
      }
    } catch (err) {
      setFormError(getClerkErrorMessage(err, 'We could not finish signing you in.'))
    }
  }

  async function handleSubmit() {
    const nextErrors: SignInLocalErrors = {
      identifier: validateEmailAddress(emailAddress),
      password: validatePassword(password),
      code: null,
    }

    setLocalErrors(nextErrors)
    setFormError(null)

    if (nextErrors.identifier || nextErrors.password) {
      return
    }

    const { error } = await signIn.password({
      emailAddress: normalizeEmailAddress(emailAddress),
      password,
    })

    if (error) {
      setFormError(getClerkErrorMessage(error, 'We could not sign you in.'))
      return
    }

    if (signIn.status === 'complete') {
      await finalizeSignIn()
      return
    }

    const shouldUseEmailCode =
      signIn.status === 'needs_client_trust' ||
      (signIn.status === 'needs_second_factor' &&
        signIn.supportedSecondFactors.some((factor) => factor.strategy === 'email_code'))

    if (shouldUseEmailCode) {
      const { error: sendCodeError } = await signIn.mfa.sendEmailCode()

      if (sendCodeError) {
        setFormError(getClerkErrorMessage(sendCodeError, 'We could not send a verification code.'))
      }

      return
    }

    if (signIn.status === 'needs_second_factor') {
      setFormError(
        'This account requires a second factor that is not included in this base email/password flow yet.',
      )
      return
    }

    setFormError('We could not finish signing you in. Please try again.')
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

    const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() })

    if (error) {
      setFormError(getClerkErrorMessage(error, 'We could not verify your code.'))
      return
    }

    if (signIn.status === 'complete') {
      await finalizeSignIn()
      return
    }

    setFormError('We could not finish verifying your sign-in. Please try again.')
  }

  async function handleResendCode() {
    setFormError(null)

    const { error } = await signIn.mfa.sendEmailCode()

    if (error) {
      setFormError(getClerkErrorMessage(error, 'We could not send a new verification code.'))
    }
  }

  async function handleStartOver() {
    await signIn.reset()
    setCode('')
    setFormError(null)
    setLocalErrors({})
  }

  return (
    <AuthScaffold
      title={needsVerification ? 'Almost in.' : 'Sign in'}
      subtitle={
        needsVerification
          ? 'Enter the verification code Clerk sent to your email to finish signing in on this device.'
          : 'Use your email and password to get back to your music circle.'
      }
      footer={
        <View className="items-center">
          <Text className="text-sm text-on-surface-variant">
            Need an account?{' '}
            <Text className="font-semibold text-primary" onPress={() => router.push('./sign-up')}>
              Create one
            </Text>
          </Text>
        </View>
      }
    >
      {!needsVerification ? (
        <>
          <SSOButtons mode="sign-in" />

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

      {needsVerification ? (
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
            error={identifierError}
            value={emailAddress}
            onChangeText={setEmailAddress}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />

          <AuthTextField
            label="Password"
            error={passwordError}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="password"
            secureTextEntry
            textContentType="password"
            placeholder="Enter your password"
          />

          <TouchableOpacity
            className="mt-2 items-center rounded-2xl bg-primary py-4 active:opacity-90"
            onPress={handleSubmit}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text className="text-base font-semibold text-on-primary">Sign in</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </AuthScaffold>
  )
}
