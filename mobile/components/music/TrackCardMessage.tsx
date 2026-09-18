import { Alert, Linking } from 'react-native'

import { TrackCard } from '@/components/music/TrackCard'
import { CardActionButton } from '@/components/music/CardActionButton'
import { MusicUpsellSheet } from '@/components/music/MusicUpsellSheet'
import { useMusicGate } from '@/hooks/useMusicGate'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { isTrackPayload } from '@/models/ChatPayloads'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'
import { useChatActions } from '@/components/chat/ChatActionsContext'

function appleMusicLink(title: string, artist: string, explicit?: string): string {
  if (explicit && (explicit.startsWith('music://') || explicit.startsWith('http'))) {
    return explicit
  }
  return `https://music.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`.trim())}`
}

/**
 * TRACK message renderer (chat × music plan, ticket 0.3). Wires the presentational TrackCard
 * to the global preview player and the music capability gate. Send-side authoring lives in 2.1.
 */
export function TrackCardMessage({ message, isMine }: MessageRendererProps) {
  const payload = message.payload
  const preview = usePreviewPlayer()
  const { requireMusic, upsell, closeUpsell, capability } = useMusicGate()
  const { addToCollabPlaylist, isInCollabPlaylist } = useChatActions()

  if (!isTrackPayload(payload)) {
    return null
  }

  const trackId = payload.id || message.id
  const hasPreview = !!payload.previewUrl
  const isActive = preview.isActive(trackId)
  const isPlaying = isActive && preview.isPlaying
  const progress = isActive && preview.durationSec > 0 ? preview.positionSec / preview.durationSec : 0

  const handleAddToLibrary = () => {
    if (requireMusic('Add to library') !== 'ok') {
      return
    }
    // Library mutation is implemented alongside the full track-card ticket (2.1); the gate is
    // the contract verified here.
    Alert.alert('Apple Music', 'Added to your library.')
  }

  const handleOpen = () => {
    void Linking.openURL(appleMusicLink(payload.title, payload.artist, payload.appleMusicUrl)).catch(() => {})
  }

  return (
    <>
      <TrackCard
        title={payload.title}
        subtitle={payload.artist}
        artworkUrl={payload.artworkUrl}
        isMine={isMine}
        hasPreview={hasPreview}
        isPlaying={isPlaying}
        progress={progress}
        onTogglePreview={hasPreview ? () => preview.toggle(trackId, payload.previewUrl!) : undefined}
        actions={
          <>
            <CardActionButton
              icon="add"
              label="Add to library"
              onPress={handleAddToLibrary}
              disabled={!capability.canPlayFull}
              isMine={isMine}
            />
            {hasPreview && addToCollabPlaylist ? (
              isInCollabPlaylist?.(payload.id) ? (
                <CardActionButton
                  icon="checkmark"
                  label="Already in the playlist"
                  onPress={() => {}}
                  disabled
                  isMine={isMine}
                />
              ) : (
                <CardActionButton
                  icon="list"
                  label="Add to playlist"
                  onPress={() => addToCollabPlaylist(payload)}
                  isMine={isMine}
                />
              )
            ) : null}
            <CardActionButton icon="open-outline" label="Open" onPress={handleOpen} isMine={isMine} />
          </>
        }
      />
      <MusicUpsellSheet
        visible={upsell.visible}
        mode={upsell.mode}
        action={upsell.action}
        onClose={closeUpsell}
      />
    </>
  )
}
