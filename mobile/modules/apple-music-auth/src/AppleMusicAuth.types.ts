import type { StyleProp, ViewStyle } from 'react-native'

export type AuthorizationStatus =
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'notDetermined'

export type CapabilityStatus = {
  musicCatalogPlayback: boolean
  addToCloudMusicLibrary: boolean
}

export type AppleMusicAuthModuleEvents = Record<string, never>

export type OnLoadEventPayload = {
  url: string
}

export type AppleMusicAuthViewProps = {
  url: string
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void
  style?: StyleProp<ViewStyle>
}
