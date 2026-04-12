import { useSSO } from '@clerk/expo'
import { useSignInWithApple } from '@clerk/expo/apple'
import { useSignInWithGoogle } from '@clerk/expo/google'
import * as AuthSession from 'expo-auth-session'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Colors } from '@/constants/colors'

const BROWSER_SSO_CALLBACK_PATH = 'sso-callback'
const BROWSER_SSO_CALLBACK_SCHEME = 'mobile'
const TEMP_USERNAME_PREFIX = 'groupys'
const TEMP_USERNAME_RETRY_LIMIT = 6

type SSOStrategy = 'google' | 'apple'
type BrowserSSOStrategy = 'oauth_google' | 'oauth_apple'

type SetActiveLike = (params: { session: string }) => Promise<void> | void

type SignInLike = {
  status?: string | null
  createdSessionId?: string | null
} | null

type SignUpLike = {
  status?: string | null
  createdSessionId?: string | null
  missingFields?: string[]
  update?: (params: Record<string, unknown>) => Promise<SignUpLike>
  create?: (params: Record<string, unknown>) => Promise<SignUpLike>
} | null

type AuthFlowResult = {
  createdSessionId: string | null
  setActive?: SetActiveLike
  signIn?: SignInLike
  signUp?: SignUpLike
  authSessionResult?: {
    type?: string | null
  } | null
}

interface SSOButtonsProps {
  mode: 'sign-in' | 'sign-up'
}

type UsernameRequirementResolution = 'activated' | 'handled-error' | 'not-applicable'

WebBrowser.maybeCompleteAuthSession()

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return
    }

    void WebBrowser.warmUpAsync()
    return () => {
      void WebBrowser.coolDownAsync()
    }
  }, [])
}

function makeBrowserRedirectUrl() {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

  return Platform.OS === 'web'
    ? AuthSession.makeRedirectUri({ path: BROWSER_SSO_CALLBACK_PATH })
    : isExpoGo
      ? AuthSession.makeRedirectUri({ path: BROWSER_SSO_CALLBACK_PATH })
      : AuthSession.makeRedirectUri({
          path: BROWSER_SSO_CALLBACK_PATH,
          scheme: BROWSER_SSO_CALLBACK_SCHEME,
        })
}

function getAuthSessionResultMessage(type?: string | null) {
  switch (type) {
    case 'cancel':
      return 'Single sign-on was canceled.'
    case 'dismiss':
      return 'The browser was closed before single sign-on finished.'
    case 'locked':
      return 'Another authentication flow is active. Please close it and try again.'
    default:
      return null
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  const clerkError = error as {
    longMessage?: string
    message?: string
    errors?: {
      longMessage?: string
      message?: string
    }[]
  }

  return (
    clerkError.errors?.[0]?.longMessage
    ?? clerkError.errors?.[0]?.message
    ?? clerkError.longMessage
    ?? clerkError.message
    ?? fallback
  )
}

function isCanceledError(error: unknown) {
  const code = (error as { code?: string | number } | null)?.code
  return code === 'SIGN_IN_CANCELLED' || code === '-5' || code === 'ERR_REQUEST_CANCELED'
}

function isUsernameConflictError(error: unknown) {
  const message = getErrorMessage(error, '').toLowerCase()
  return message.includes('username') && (
    message.includes('taken')
    || message.includes('already')
    || message.includes('exists')
    || message.includes('in use')
  )
}

function generateTemporaryUsername(attempt: number) {
  const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}${attempt.toString(36)}`
  return `${TEMP_USERNAME_PREFIX}${seed}`.slice(0, 30)
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  )
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000000">
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  )
}

export default function SSOButtons({ mode }: SSOButtonsProps) {
  useWarmUpBrowser()

  const { startGoogleAuthenticationFlow } = useSignInWithGoogle()
  const { startAppleAuthenticationFlow } = useSignInWithApple()
  const { startSSOFlow } = useSSO()

  const [loadingStrategy, setLoadingStrategy] = useState<SSOStrategy | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isExpoGoNative = Constants.appOwnership === 'expo' && Platform.OS !== 'web'
  const isWeb = Platform.OS === 'web'

  async function activateSession(result: AuthFlowResult) {
    if (result.createdSessionId && result.setActive) {
      await Promise.resolve(result.setActive({ session: result.createdSessionId }))
      return true
    }

    if (result.signIn?.status === 'complete' && result.signIn.createdSessionId && result.setActive) {
      await Promise.resolve(result.setActive({ session: result.signIn.createdSessionId }))
      return true
    }

    if (result.signUp?.status === 'complete' && result.signUp.createdSessionId && result.setActive) {
      await Promise.resolve(result.setActive({ session: result.signUp.createdSessionId }))
      return true
    }

    return false
  }

  async function resolveMissingUsernameRequirement(result: AuthFlowResult): Promise<UsernameRequirementResolution> {
    let signUp = result.signUp

    if (!signUp || signUp.status !== 'missing_requirements') {
      return 'not-applicable'
    }

    const missingFields = signUp.missingFields ?? []
    if (!missingFields.includes('username')) {
      if (missingFields.length > 0) {
        setError(`Sign-up is blocked by Clerk requirements (${missingFields.join(', ')}).`) 
        return 'handled-error'
      }

      return 'not-applicable'
    }

    const unsupportedFields = missingFields.filter((field) => field !== 'username')
    if (unsupportedFields.length > 0) {
      setError(`Sign-up is blocked by Clerk requirements (${unsupportedFields.join(', ')}).`)
      return 'handled-error'
    }

    if (typeof signUp.update !== 'function' && typeof signUp.create !== 'function') {
      setError('Could not finish SSO sign-up requirements. Please try again.')
      return 'handled-error'
    }

    for (let attempt = 0; attempt < TEMP_USERNAME_RETRY_LIMIT; attempt += 1) {
      const temporaryUsername = generateTemporaryUsername(attempt)

      try {
        if (typeof signUp.update === 'function') {
          signUp = await signUp.update({ username: temporaryUsername })
        }
      } catch (updateError) {
        if (isUsernameConflictError(updateError)) {
          continue
        }

        setError(getErrorMessage(updateError, 'Could not complete sign-up username requirement.'))
        return 'handled-error'
      }

      if (await activateSession({ ...result, signUp })) {
        return 'activated'
      }

      try {
        if (typeof signUp.create === 'function') {
          signUp = await signUp.create({
            transfer: true,
            username: temporaryUsername,
            unsafeMetadata: { onboarding_completed: false },
          })
        }
      } catch (createError) {
        if (isUsernameConflictError(createError)) {
          continue
        }

        setError(getErrorMessage(createError, 'Could not complete sign-up username requirement.'))
        return 'handled-error'
      }

      if (await activateSession({ ...result, signUp })) {
        return 'activated'
      }
    }

    setError('Could not reserve a temporary username. Please try again.')
    return 'handled-error'
  }

  async function runBrowserSSO(strategy: BrowserSSOStrategy) {
    const result = await startSSOFlow({
      strategy,
      redirectUrl: makeBrowserRedirectUrl(),
      unsafeMetadata: { onboarding_completed: false },
    })

    if (await activateSession(result)) {
      return true
    }

    const resolution = await resolveMissingUsernameRequirement(result)
    if (resolution === 'activated') {
      return true
    }
    if (resolution === 'handled-error') {
      return false
    }

    const resultMessage = getAuthSessionResultMessage(result.authSessionResult?.type)
    if (resultMessage) {
      setError(resultMessage)
      return false
    }

    setError('Single sign-on did not complete. Please try again.')
    return false
  }

  async function handleGoogleSSO() {
    setLoadingStrategy('google')
    setError(null)

    try {
      if (isWeb || isExpoGoNative) {
        await runBrowserSSO('oauth_google')
        return
      }

      const nativeResult = await startGoogleAuthenticationFlow({
        unsafeMetadata: { onboarding_completed: false },
      })

      if (await activateSession(nativeResult)) {
        return
      }

      const resolution = await resolveMissingUsernameRequirement(nativeResult)
      if (resolution !== 'not-applicable') {
        return
      }

      setError('Google sign-in did not complete. Please try again.')
    } catch (nativeError) {
      if (isCanceledError(nativeError)) {
        return
      }

      try {
        await runBrowserSSO('oauth_google')
      } catch (fallbackError) {
        setError(getErrorMessage(fallbackError, getErrorMessage(nativeError, 'Google sign-in failed. Please try again.')))
      }
    } finally {
      setLoadingStrategy(null)
    }
  }

  async function handleAppleSSO() {
    setLoadingStrategy('apple')
    setError(null)

    try {
      if (isExpoGoNative) {
        await runBrowserSSO('oauth_apple')
        return
      }

      const nativeResult = await startAppleAuthenticationFlow({
        unsafeMetadata: { onboarding_completed: false },
      })

      if (await activateSession(nativeResult)) {
        return
      }

      const resolution = await resolveMissingUsernameRequirement(nativeResult)
      if (resolution !== 'not-applicable') {
        return
      }

      setError('Apple sign-in did not complete. Please try again.')
    } catch (nativeError) {
      if (isCanceledError(nativeError)) {
        return
      }

      try {
        await runBrowserSSO('oauth_apple')
      } catch (fallbackError) {
        setError(getErrorMessage(fallbackError, getErrorMessage(nativeError, 'Apple sign-in failed. Please try again.')))
      }
    } finally {
      setLoadingStrategy(null)
    }
  }

  const label = mode === 'sign-in' ? 'Sign in' : 'Sign up'
  const isLoading = loadingStrategy !== null
  const useGlass = isLiquidGlassAvailable()

  return (
    <View className="gap-3">
      {error ? (
        <View className="rounded-2xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-600">{error}</Text>
        </View>
      ) : null}

      {isExpoGoNative ? (
        <View className="rounded-2xl bg-amber-50 px-4 py-3">
          <Text className="text-sm text-amber-700">
            Expo Go uses browser-based SSO fallback. Development builds use native SSO.
          </Text>
        </View>
      ) : null}

      {useGlass ? (
        <GlassView isInteractive style={{ borderRadius: 16, overflow: 'hidden' }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 }}
            onPress={handleGoogleSSO}
            disabled={isLoading}
          >
            {loadingStrategy === 'google' ? (
              <ActivityIndicator color={Colors.onSurface} />
            ) : (
              <>
                <GoogleIcon />
                <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.onSurface }}>{label} with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </GlassView>
      ) : (
        <TouchableOpacity
          className="flex-row items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest py-4 active:opacity-90"
          onPress={handleGoogleSSO}
          disabled={isLoading}
        >
          {loadingStrategy === 'google' ? (
            <ActivityIndicator color={Colors.onSurface} />
          ) : (
            <>
              <GoogleIcon />
              <Text className="text-base font-semibold text-on-surface">{label} with Google</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {Platform.OS === 'ios' ? (
        useGlass ? (
          <GlassView isInteractive style={{ borderRadius: 16, overflow: 'hidden' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 16 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 }}
                onPress={handleAppleSSO}
                disabled={isLoading}
              >
                {loadingStrategy === 'apple' ? (
                  <ActivityIndicator color={Colors.onSurface} />
                ) : (
                  <>
                    <AppleIcon />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.onSurface }}>{label} with Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </GlassView>
        ) : (
          <TouchableOpacity
            className="flex-row items-center justify-center gap-3 rounded-2xl bg-black py-4 active:opacity-90"
            onPress={handleAppleSSO}
            disabled={isLoading}
          >
            {loadingStrategy === 'apple' ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <AppleIcon />
                <Text className="text-base font-semibold text-white">{label} with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )
      ) : null}
    </View>
  )
}
