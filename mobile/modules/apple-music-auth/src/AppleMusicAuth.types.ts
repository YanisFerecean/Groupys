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

/** Emitted by the native player (~1s while playing + on state/item changes). */
export type PlaybackStatusEvent = {
  /** Apple Music catalog store id of the loaded song ('' when stopped). */
  storeId: string
  positionSec: number
  durationSec: number
  isPlaying: boolean
  /** Song finished or playback was stopped. */
  ended: boolean
}

export type AppleMusicAuthModuleEvents = {
  onPlaybackStatus: (event: PlaybackStatusEvent) => void
}

export type OnLoadEventPayload = {
  url: string
}

export type AppleMusicAuthViewProps = {
  url: string
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void
  style?: StyleProp<ViewStyle>
}
