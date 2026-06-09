import { useState } from 'react'
import { Alert } from 'react-native'

import { CardActionButton } from '@/components/music/CardActionButton'
import { MusicUpsellSheet } from '@/components/music/MusicUpsellSheet'
import { PlaylistCard } from '@/components/music/PlaylistCard'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'
import { useMusicGate } from '@/hooks/useMusicGate'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { isCollabPlaylistPayload } from '@/models/ChatPayloads'

/** Live server-built playlist card pinned in a conversation (ticket 6.1). */
export function CollabPlaylistCardMessage({ message, isMine }: MessageRendererProps) {
  const payload = message.payload
  const preview = usePreviewPlayer()
  const { requireMusic, upsell, closeUpsell, capability } = useMusicGate()
  const [index, setIndex] = useState<number | null>(null)

  if (!isCollabPlaylistPayload(payload)) {
    return null
  }

  const previews = (payload.previews ?? []).filter(track => !!track.previewUrl)
  const handlePreview = () => {
    const next = (index ?? -1) + 1
    if (next >= previews.length) {
      setIndex(null)
      preview.stop()
      return
    }
    setIndex(next)
    preview.play(`${payload.id}:collab:${next}`, previews[next].previewUrl)
  }
  const handleSave = () => {
    if (requireMusic('Save collaborative playlist') !== 'ok') return
    Alert.alert('Apple Music', 'Collaborative playlist saved to your library.')
  }
  const previewing = index != null ? previews[index] : null

  return (
    <>
      <PlaylistCard
        title={payload.title}
        subtitle={payload.curator}
        artworkUrl={payload.artworkUrl}
        isMine={isMine}
        meta={`${payload.trackCount} ${payload.trackCount === 1 ? 'track' : 'tracks'}`}
        actions={
          <>
            {previews.length > 0 ? (
              <CardActionButton
                icon="play"
                label={previewing ? `♫ ${previewing.title}` : 'Preview'}
                onPress={handlePreview}
                isMine={isMine}
              />
            ) : null}
            <CardActionButton
              icon="add"
              label="Save to my library"
              onPress={handleSave}
              disabled={!capability.canPlayFull}
              isMine={isMine}
            />
          </>
        }
      />
      <MusicUpsellSheet visible={upsell.visible} mode={upsell.mode} action={upsell.action} onClose={closeUpsell} />
    </>
  )
}
