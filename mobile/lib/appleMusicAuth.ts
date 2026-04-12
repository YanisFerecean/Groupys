import { Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'

import type {
  AuthorizationStatus,
  CapabilityStatus,
} from '@/modules/apple-music-auth/src/AppleMusicAuth.types'

interface AppleMusicAuthNativeModule {
  requestAuthorization(): Promise<AuthorizationStatus>
  getMusicUserToken(developerToken: string): Promise<string>
  getCapabilityStatus(): Promise<CapabilityStatus>
}

const DEV_BUILD_REQUIRED_MESSAGE =
  'Apple Music connect requires an iOS development build (Expo Go does not include this native module).'

const appleMusicConnectEnv = process.env.EXPO_PUBLIC_ENABLE_APPLE_MUSIC_CONNECT
const appleMusicConnectExplicitlyEnabled = appleMusicConnectEnv === 'true'
const appleMusicConnectExplicitlyDisabled = appleMusicConnectEnv === 'false'

// Developer-friendly default: enabled in dev when unset, disabled in production unless explicitly enabled.
export const APPLE_MUSIC_CONNECT_ENABLED =
  appleMusicConnectExplicitlyEnabled || (!appleMusicConnectExplicitlyDisabled && __DEV__)

export const APPLE_MUSIC_SIMULATOR_MOCK_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_APPLE_MUSIC_SIMULATOR_MOCK === 'true'

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
