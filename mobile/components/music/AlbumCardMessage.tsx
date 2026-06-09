import { Alert, Linking } from 'react-native'

import { AlbumCard } from '@/components/music/AlbumCard'
import { CardActionButton } from '@/components/music/CardActionButton'
import { MusicUpsellSheet } from '@/components/music/MusicUpsellSheet'
import { useMusicGate } from '@/hooks/useMusicGate'
import { isAlbumPayload } from '@/models/ChatPayloads'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'

function appleMusicLink(title: string, artist: string, explicit?: string): string {
  if (explicit && (explicit.startsWith('music://') || explicit.startsWith('http'))) {
    return explicit
  }
  return `https://music.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`.trim())}`
}

/** ALBUM message renderer (ticket 2.2). */
export function AlbumCardMessage({ message, isMine }: MessageRendererProps) {
  const payload = message.payload
  const { requireMusic, upsell, closeUpsell, capability } = useMusicGate()

  if (!isAlbumPayload(payload)) {
    return null
  }

  const handleSave = () => {
    if (requireMusic('Save album') !== 'ok') return
    Alert.alert('Apple Music', 'Album saved to your library.')
  }

  const handleOpen = () => {
    void Linking.openURL(appleMusicLink(payload.title, payload.artist, payload.appleMusicUrl)).catch(() => {})
  }

  return (
    <>
      <AlbumCard
        title={payload.title}
        subtitle={payload.artist}
        artworkUrl={payload.artworkUrl}
        isMine={isMine}
        meta={typeof payload.trackCount === 'number' ? `${payload.trackCount} tracks` : undefined}
        actions={
          <>
            <CardActionButton
              icon="add"
              label="Save album"
              onPress={handleSave}
              disabled={!capability.canPlayFull}
              isMine={isMine}
            />
            <CardActionButton icon="open-outline" label="Open" onPress={handleOpen} isMine={isMine} />
          </>
        }
      />
      <MusicUpsellSheet visible={upsell.visible} mode={upsell.mode} action={upsell.action} onClose={closeUpsell} />
    </>
  )
}
