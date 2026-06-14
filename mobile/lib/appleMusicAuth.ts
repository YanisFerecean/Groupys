import { Platform } from 'react-native'
import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core'

import type {
  AuthorizationStatus,
  CapabilityStatus,
  PlaybackStatusEvent,
} from '@/modules/apple-music-auth/src/AppleMusicAuth.types'

export type { PlaybackStatusEvent }

interface AppleMusicAuthNativeModule {
  requestAuthorization(): Promise<AuthorizationStatus>
  getMusicUserToken(developerToken: string): Promise<string>
  getCapabilityStatus(): Promise<CapabilityStatus>
  playCatalogId(storeId: string): void
  pausePlayback(): void
  resumePlayback(): void
  stopPlayback(): void
  seekTo(seconds: number): void
  addListener(
    eventName: 'onPlaybackStatus',
    listener: (event: PlaybackStatusEvent) => void,
  ): EventSubscription
}

const DEV_BUILD_REQUIRED_MESSAGE =
  'Apple Music connect requires an iOS development build (Expo Go does not include this native module).'

const appleMusicConnectEnv = process.env.EXPO_PUBLIC_ENABLE_APPLE_MUSIC_CONNECT
const appleMusicConnectExplicitlyEnabled = appleMusicConnectEnv === 'true'
const appleMusicConnectExplicitlyDisabled = appleMusicConnectEnv === 'false'

// Developer-friendly default: enabled in dev when unset, disabled in production unless explicitly enabled.
export const APPLE_MUSIC_CONNECT_ENABLED =
  appleMusicConnectExplicitlyEnabled || (!appleMusicConnectExplicitlyDisabled && __DEV__)

function getNativeModule(): AppleMusicAuthNativeModule {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Music connect is currently available on iOS only.')
  }

  const nativeModule = requireOptionalNativeModule<AppleMusicAuthNativeModule>('AppleMusicAuth')
  if (nativeModule) {
    return nativeModule
  }

  throw new Error(DEV_BUILD_REQUIRED_MESSAGE)
}

export function isAppleMusicNativeBridgeAvailable(): boolean {
  if (Platform.OS !== 'ios') return false

  return !!requireOptionalNativeModule<AppleMusicAuthNativeModule>('AppleMusicAuth')
}

export async function requestAuthorization(): Promise<AuthorizationStatus> {
  return getNativeModule().requestAuthorization()
}

export async function getMusicUserToken(developerToken: string): Promise<string> {
  return getNativeModule().getMusicUserToken(developerToken)
}

export async function getCapabilityStatus(): Promise<CapabilityStatus> {
  return getNativeModule().getCapabilityStatus()
}

export function getAppleMusicDevBuildMessage(): string {
  return DEV_BUILD_REQUIRED_MESSAGE
}

// ── Full-song playback ────────────────────────────────────────────────────────
// These reuse the device's signed-in Apple Music account (no token needed). They no-op when the
// native bridge isn't available (non-iOS / Expo Go), so callers can stay engine-agnostic.

function getOptionalNativeModule(): AppleMusicAuthNativeModule | null {
  if (Platform.OS !== 'ios') return null
  return requireOptionalNativeModule<AppleMusicAuthNativeModule>('AppleMusicAuth') ?? null
}

export function playCatalogId(storeId: string): void {
  getOptionalNativeModule()?.playCatalogId(storeId)
}

export function pausePlayback(): void {
  getOptionalNativeModule()?.pausePlayback()
}

export function resumePlayback(): void {
  getOptionalNativeModule()?.resumePlayback()
}

export function stopPlayback(): void {
  getOptionalNativeModule()?.stopPlayback()
}

export function seekTo(seconds: number): void {
  getOptionalNativeModule()?.seekTo(seconds)
}

/** Subscribe to native player status (~1s while playing + on state changes). Returns an unsubscribe. */
export function addPlaybackStatusListener(
  listener: (event: PlaybackStatusEvent) => void,
): () => void {
  const sub = getOptionalNativeModule()?.addListener('onPlaybackStatus', listener)
  return () => sub?.remove()
}
