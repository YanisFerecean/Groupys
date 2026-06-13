import { useAuth } from '@clerk/expo'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

import { getMusicDeveloperToken } from '@/lib/api'
import {
  MUSICKIT_HTML,
  configureMusicKit,
  getMusicKitSnapshot,
  handleMusicKitMessage,
  registerMusicKitSender,
  subscribeMusicKit,
  unregisterMusicKitSender,
} from '@/lib/musicKit'

// A real https origin the team controls — MusicKit JS is picky about page origin / cookies, so the
// inline page is loaded under this baseUrl rather than `about:blank`.
const PLAYER_BASE_URL = 'https://groupys.app'

/**
 * Hosts the hidden MusicKit-JS WebView for full-song Listen Together playback (iOS).
 *
 * Mounted once near the app root so audio survives screen changes. The WebView is normally a 1×1
 * off-screen sliver; it only becomes a full-screen overlay during the one-time Apple Music sign-in
 * (`needsAuth`), so that flow stays interactive. Android/web have no MusicKit playback path, so the
 * provider renders nothing there and Listen Together stays on synced 30s previews.
 */
export function MusicKitProvider({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'ios') return <>{children}</>
  return (
    <>
      {children}
      <MusicKitWebViewHost />
    </>
  )
}

function MusicKitWebViewHost() {
  const { getToken, isSignedIn } = useAuth()
  const webRef = useRef<WebView>(null)
  const snapshot = useSyncExternalStore(subscribeMusicKit, getMusicKitSnapshot, getMusicKitSnapshot)

  // Backend-minted Apple Music developer token (a JWT, valid for hours). Only needed once signed in.
  const { data: developerToken } = useQuery({
    queryKey: ['music', 'developer-token'],
    queryFn: async () => {
      const token = await getToken()
      const res = await getMusicDeveloperToken(token)
      return res.token
    },
    enabled: !!isSignedIn,
    staleTime: 30 * 60 * 1000,
  })

  // Configure MusicKit as soon as the page is mounted and the token is available.
  useEffect(() => {
    if (developerToken) configureMusicKit(developerToken)
  }, [developerToken])

  useEffect(() => () => unregisterMusicKitSender(), [])

  const needsAuth = snapshot.needsAuth

  return (
    <View
      pointerEvents={needsAuth ? 'auto' : 'none'}
      style={needsAuth ? styles.authOverlay : styles.hidden}
    >
      <WebView
        ref={webRef}
        source={{ html: MUSICKIT_HTML, baseUrl: PLAYER_BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onMessage={(e) => handleMusicKitMessage(e.nativeEvent.data)}
        onLoad={() => {
          registerMusicKitSender((js) => webRef.current?.injectJavaScript(js))
        }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    top: -10,
    left: -10,
    opacity: 0,
  },
  authOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 9999,
  },
})
