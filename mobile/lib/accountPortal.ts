import * as AuthSession from 'expo-auth-session'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'

const ACCOUNT_PORTAL_CALLBACK_PATH = 'sso-callback'
const ACCOUNT_PORTAL_CALLBACK_SCHEME = 'mobile'

function getBaseUrl(publishableKey: string): string {
  const encoded = publishableKey.replace(/^pk_(test|live)_/, '')
  // atob is available on Hermes (React Native 0.70+)
  const decoded = atob(encoded)
  const domain = decoded.replace(/\$$/, '')
  return `https://${domain}`
}

const BASE_URL = getBaseUrl(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!)

function getDefaultRedirectUrl() {
  return Platform.OS === 'web'
    ? AuthSession.makeRedirectUri({ path: ACCOUNT_PORTAL_CALLBACK_PATH })
    : AuthSession.makeRedirectUri({
        path: ACCOUNT_PORTAL_CALLBACK_PATH,
        scheme: ACCOUNT_PORTAL_CALLBACK_SCHEME,
      })
}

type OpenAccountPortalOptions = {
  redirectUrl?: string
}

export async function openAccountPortal(
  path: 'sign-in' | 'sign-up',
  options: OpenAccountPortalOptions = {},
): Promise<WebBrowser.WebBrowserAuthSessionResult> {
  const redirectUrl = options.redirectUrl ?? getDefaultRedirectUrl()
  const url = `${BASE_URL}/${path}?redirect_url=${encodeURIComponent(redirectUrl)}`

  const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl)

  if (result.type === 'success' && result.url) {
    // Re-deliver the redirect URL through Expo's Linking system so ClerkProvider
    // can detect the __clerk_db_jwt / __clerk_handshake params and activate the session.
    await Linking.openURL(result.url)
  }

  return result
}
