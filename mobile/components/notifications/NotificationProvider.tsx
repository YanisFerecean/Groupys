import { useAuth } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Platform } from 'react-native'
import { registerDeviceToken } from '@/lib/api'
import {
  configureNotificationHandler,
  getNotificationsModule,
  registerForPushNotificationsAsync,
  requestLocalNotificationPermission,
} from '@/lib/notifications'
import { useNotificationBannerStore } from '@/stores/useNotificationBannerStore'
import InAppNotificationBanner from './InAppNotificationBanner'

// Set the foreground presentation policy once, at module load (no-op when push is unavailable).
configureNotificationHandler()

function readString(data: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = data?.[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * Registers the device's Expo push token with the backend (after auth) and wires notification
 * listeners: foreground notifications render a custom in-app banner, taps deep-link into the app.
 * Mount inside the authenticated layout.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth()
  const router = useRouter()
  const show = useNotificationBannerStore((s) => s.show)
  const registeredTokenRef = useRef<string | null>(null)
  // Dedup so a single tap isn't handled by both the runtime listener and the
  // cold-start (getLastNotificationResponseAsync) path.
  const handledResponseRef = useRef<string | null>(null)

  // Deep-link from a notification the user tapped. Safe to call from both the live
  // response listener and the cold-start path; the ref guards against double navigation.
  const handleNotificationResponse = useCallback(
    (response: { notification: { request: { identifier?: string; content: { data?: unknown } } } } | null) => {
      if (!response) return
      const request = response.notification.request
      const id = request.identifier ?? null
      if (id && handledResponseRef.current === id) return
      handledResponseRef.current = id
      const data = request.content.data as Record<string, unknown> | undefined
      const deeplink = readString(data, 'deeplink')
      if (deeplink) {
        router.push(deeplink as never)
      }
    },
    [router],
  )

  // Register the push token once the user is authenticated.
  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    ;(async () => {
      const expoToken = await registerForPushNotificationsAsync()
      // Simulator can't get an Expo push token; still surface the permission dialog in dev so the
      // local-notification banner can be tested.
      if (!expoToken && __DEV__) await requestLocalNotificationPermission()
      if (cancelled || !expoToken || registeredTokenRef.current === expoToken) return
      try {
        const authToken = await getToken()
        await registerDeviceToken(authToken, expoToken, Platform.OS)
        registeredTokenRef.current = expoToken
      } catch (error) {
        console.warn('Failed to register device push token', error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSignedIn, getToken])

  // Foreground notifications → custom in-app banner; taps → deep-link.
  useEffect(() => {
    const Notifications = getNotificationsModule()
    if (!Notifications) return

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content
      const payload = data as Record<string, unknown> | undefined
      show({
        id: notification.request.identifier ?? String(Date.now()),
        title: title ?? 'Groupys',
        body: body ?? undefined,
        imageUrl: readString(payload, 'imageUrl'),
        deeplink: readString(payload, 'deeplink'),
        type: readString(payload, 'type'),
      })
    })

    const responseSub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)

    return () => {
      receivedSub.remove()
      responseSub.remove()
    }
  }, [handleNotificationResponse, show])

  // Cold start: when the app was launched by tapping a notification (killed state), the
  // response listener above never fires — pull the launching response and deep-link once.
  useEffect(() => {
    const Notifications = getNotificationsModule()
    if (!Notifications || !isSignedIn) return
    let cancelled = false
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!cancelled) handleNotificationResponse(response)
    })
    return () => {
      cancelled = true
    }
  }, [handleNotificationResponse, isSignedIn])

  return (
    <>
      {children}
      <InAppNotificationBanner />
    </>
  )
}
