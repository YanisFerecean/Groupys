import { useSSO } from '@clerk/expo'
import * as AuthSession from 'expo-auth-session'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '@/constants/colors'
import { openAccountPortal } from '@/lib/accountPortal'

WebBrowser.maybeCompleteAuthSession()

const SSO_CALLBACK_PATH = 'sso-callback'
const SSO_CALLBACK_SCHEME = 'mobile'

function makeSSORedirectUrl() {
  return Platform.OS === 'web'
    ? AuthSession.makeRedirectUri({ path: SSO_CALLBACK_PATH })
    : AuthSession.makeRedirectUri({ path: SSO_CALLBACK_PATH, scheme: SSO_CALLBACK_SCHEME })
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

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      void WebBrowser.warmUpAsync()
      return () => {
        void WebBrowser.coolDownAsync()
      }
    }
  }, [])
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

type SSOStrategy = 'oauth_google' | 'oauth_apple'

interface SSOButtonsProps {
  mode: 'sign-in' | 'sign-up'
}

export default function SSOButtons({ mode }: SSOButtonsProps) {
  useWarmUpBrowser()

  const router = useRouter()
  const { startSSOFlow } = useSSO()
  const [loadingStrategy, setLoadingStrategy] = useState<SSOStrategy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isExpoGo = Constants.appOwnership === 'expo'

  async function handleSSO(strategy: SSOStrategy) {
    setLoadingStrategy(strategy)
    setError(null)

    try {
      const redirectUrl = makeSSORedirectUrl()
      const { createdSessionId, setActive, signUp, signIn, authSessionResult } = await startSSOFlow({
        strategy,
        redirectUrl,
      })
      const authSessionResultType = authSessionResult?.type ?? null

      if (createdSessionId && setActive) {
        // Existing user or new user with all requirements satisfied — set session
        // and let the auth layout redirect reactively.
        await setActive({ session: createdSessionId })
        return
      }

      if (signUp?.status === 'complete' && signUp.createdSessionId && setActive) {
        await setActive({ session: signUp.createdSessionId })
        return
      }

      if (signIn?.status === 'complete' && signIn.createdSessionId && setActive) {
        await setActive({ session: signIn.createdSessionId })
        return
      }

      if (signUp || signIn) {
        const continuationPath = signUp ? 'sign-up' : 'sign-in'
        const signUpMissingFields = signUp?.missingFields ?? []

        console.warn('SSO requires hosted continuation', {
          mode,
          strategy,
          continuationPath,
          authSessionResultType,
          signInStatus: signIn?.status ?? null,
          signUpStatus: signUp?.status ?? null,
          signUpMissingFields,
        })

        if (signUp?.status === 'missing_requirements' && signUpMissingFields.includes('username')) {
          router.push('/(auth)/sso-continue')
          return
        }

        try {
          const hostedResult = await openAccountPortal(continuationPath, { redirectUrl })
          const hostedResultMessage = getAuthSessionResultMessage(hostedResult.type)

          if (hostedResult.type === 'success') {
            return
          }

          if (hostedResultMessage) {
            setError(hostedResultMessage)
            return
          }

          setError('Single sign-on could not continue in the hosted flow.')
          return
        } catch (portalError) {
          const continuationMessage =
            portalError instanceof Error
              ? portalError.message
              : 'Single sign-on could not continue in the hosted flow.'
          const expoGoHint = isExpoGo
            ? ' Expo Go uses dynamic callback URLs, so continue in a development build if this keeps failing.'
            : ''
          setError(`${continuationMessage}${expoGoHint}`)
          return
        }
      }

      const authSessionResultMessage = getAuthSessionResultMessage(authSessionResultType)
      if (authSessionResultMessage) {
        setError(authSessionResultMessage)
        return
      }

      if (isExpoGo) {
        setError(
          'Single sign-on did not complete in Expo Go. Try again in a development build with Clerk native redirects configured.',
        )
        return
      }

      setError(
        `Single sign-on did not complete. Verify Clerk native redirect URLs include ${SSO_CALLBACK_SCHEME}://${SSO_CALLBACK_PATH}.`,
      )
    } catch (err) {
      const baseMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      const expoGoHint = isExpoGo
        ? ' Expo Go uses dynamic callback URLs, so continue in a development build if needed.'
        : ''
      setError(`${baseMessage}${expoGoHint}`)
    } finally {
      setLoadingStrategy(null)
    }
  }

  const label = mode === 'sign-in' ? 'Sign in' : 'Sign up'
  const isLoading = loadingStrategy !== null

  return (
    <View className="gap-3">
      {error ? (
        <View className="rounded-2xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-600">{error}</Text>
        </View>
      ) : null}

      {isExpoGo ? (
        <View className="rounded-2xl bg-amber-50 px-4 py-3">
          <Text className="text-sm text-amber-700">
            Expo Go uses dynamic callback URLs, so SSO is best-effort here. If callback verification
            fails, run the app with a development build.
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        className="flex-row items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest py-4 active:opacity-90"
        onPress={() => handleSSO('oauth_google')}
        disabled={isLoading}
      >
        {loadingStrategy === 'oauth_google' ? (
          <ActivityIndicator color={Colors.onSurface} />
        ) : (
          <>
            <GoogleIcon />
            <Text className="text-base font-semibold text-on-surface">{label} with Google</Text>
          </>
        )}
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <TouchableOpacity
          className="flex-row items-center justify-center gap-3 rounded-2xl bg-black py-4 active:opacity-90"
          onPress={() => handleSSO('oauth_apple')}
          disabled={isLoading}
        >
          {loadingStrategy === 'oauth_apple' ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <AppleIcon />
              <Text className="text-base font-semibold text-white">{label} with Apple</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  )
}
