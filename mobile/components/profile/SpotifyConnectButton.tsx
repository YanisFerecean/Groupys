import { MusicConnectButton } from '@/components/profile/MusicConnectButton'

interface SpotifyConnectButtonProps {
  connected: boolean
  onConnect: () => void
  onDisconnect?: () => void
}

/**
 * @deprecated use `MusicConnectButton` instead.
 */
export function SpotifyConnectButton({ connected, onConnect, onDisconnect }: SpotifyConnectButtonProps) {
  return (
    <MusicConnectButton
      connected={connected}
      onConnect={onConnect}
      onDisconnect={onDisconnect ?? (() => undefined)}
    />
  )
}
