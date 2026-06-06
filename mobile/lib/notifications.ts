import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'

type NotificationsModule = typeof import('expo-notifications')

/**
 * Push is unavailable in Expo Go (SDK 53+ dropped the remote-push native module). Only a
 * dev-client / standalone build ships `ExpoPushTokenManager`.
 */
export const pushSupported = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient

let cachedModule: NotificationsModule | null | undefined

/**
 * Lazily loads expo-notifications. Returns null (instead of crashing) when the native module
 * isn't in the running binary — e.g. Expo Go, or a dev client built before the package was added.
 * Statically importing the module would evaluate the native bridge and throw at load time.
 */
export function getNotificationsModule(): NotificationsModule | null {
  if (cachedModule !== undefined) return cachedModule
  if (!pushSupported) {
    cachedModule = null
    return null
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as NotificationsModule
  } catch (error) {
    console.warn('expo-notifications native module unavailable — rebuild the dev client', error)
    cachedModule = null
  }
  return cachedModule
}

/** Lazily checks expo-device's isDevice, tolerating its native module being absent (Expo Go). */
function isPhysicalDevice(): boolean {
  if (!pushSupported) return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('expo-device') as typeof import('expo-device')).isDevice
  } catch {
    return false
  }
}

/**
 * Foreground policy: the OS never draws its own banner — we render a custom in-app banner
 * (see InAppNotificationBanner). Lock-screen / background still use the rich system presentation.
 */
export function configureNotificationHandler(): void {
  const Notifications = getNotificationsModule()
  if (!Notifications) return
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  })
}

function resolveProjectId(): string | undefined {
  const fromExpo = Constants.expoConfig?.extra?.eas?.projectId
  const fromEas = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  return fromExpo ?? fromEas
}

/** Lazily create the Android channel (no-op cost on iOS, future-proofs Android). */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  const Notifications = getNotificationsModule()
  if (!Notifications) return
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#ba002b',
  })
}

/**
 * Requests notification permission and returns the Expo push token, or null when unavailable
 * (Expo Go, simulator, permission denied, or missing EAS project id). Never throws.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Notifications = getNotificationsModule()
  if (!Notifications || !isPhysicalDevice()) return null

  await ensureAndroidChannel()

  const { status: existing } = await Notifications.getPermissionsAsync()
  let granted = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    granted = status
  }
  if (granted !== 'granted') return null

  try {
    const projectId = resolveProjectId()
    const response = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    return response.data
  } catch (error) {
    console.warn('Failed to get Expo push token', error)
    return null
  }
}

/**
 * Requests notification permission WITHOUT the physical-device gate. Local notifications work in
 * the simulator (unlike remote push), so this is the dev path to surface the iOS permission dialog
 * and exercise the banner UI. Returns true when granted. Never throws.
 */
export async function requestLocalNotificationPermission(): Promise<boolean> {
  const Notifications = getNotificationsModule()
  if (!Notifications) return false

  await ensureAndroidChannel()

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

/**
 * Dev helper: schedules a LOCAL notification (~1s out) with a payload mirroring real pushes, so the
 * foreground in-app banner + deep-link path can be tested in the simulator. No-op without the module.
 */
export async function sendLocalTestNotification(opts?: {
  title?: string
  body?: string
  data?: Record<string, unknown>
}): Promise<void> {
  const Notifications = getNotificationsModule()
  if (!Notifications) return
  if (!(await requestLocalNotificationPermission())) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: opts?.title ?? 'Groupys',
      body: opts?.body ?? 'This is a local test notification.',
      data: opts?.data ?? { type: 'test', deeplink: '/(home)/(profile)/notifications' },
    },
    trigger: { seconds: 1 } as never,
  })
}
