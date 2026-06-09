import { useState } from 'react'
import { Alert, Linking } from 'react-native'

import { PlaylistCard } from '@/components/music/PlaylistCard'
import { CardActionButton } from '@/components/music/CardActionButton'
import { MusicUpsellSheet } from '@/components/music/MusicUpsellSheet'
import { useMusicGate } from '@/hooks/useMusicGate'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { isPlaylistPayload } from '@/models/ChatPayloads'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'

function appleMusicLink(title: string, curator: string, explicit?: string): string {
  if (explicit && (explicit.startsWith('music://') || explicit.startsWith('http'))) {
    return explicit
  }
  return `https://music.apple.com/search?term=${encodeURIComponent(`${title} ${curator}`.trim())}`
}

/**
 * PLAYLIST message renderer (ticket 2.3). Cycles 30s previews of the first N tracks via the
 * shared preview player; Save is subscription-gated; Open deep-links to Apple Music.
 */
export function PlaylistCardMessage({ message, isMine }: MessageRendererProps) {
  const payload = message.payload
  const preview = usePreviewPlayer()
  const { requireMusic, upsell, closeUpsell, capability } = useMusicGate()
  const [index, setIndex] = useState<number | null>(null)

  if (!isPlaylistPayload(payload)) {
    return null
  }

  const previews = (payload.previews ?? []).filter(p => !!p.previewUrl)

  // Each press advances through the first N previews; stops after the last.
  const handlePreview = () => {
    const next = (index ?? -1) + 1
    if (next >= previews.length) {
      setIndex(null)
      preview.stop()
      return
    }
    setIndex(next)
    preview.play(`${payload.id}:pl:${next}`, previews[next].previewUrl)
  }

  const handleSave = () => {
    if (requireMusic('Save playlist') !== 'ok') return
    Alert.alert('Apple Music', 'Playlist saved to your library.')
  }

  const handleOpen = () => {
    void Linking.openURL(appleMusicLink(payload.title, payload.curator ?? '', payload.appleMusicUrl)).catch(() => {})
  }

  const previewing = index != null ? previews[index] : null
  const previewLabel = previewing ? `♫ ${previewing.title}` : 'Preview'

  return (
    <>
      <PlaylistCard
        title={payload.title}
        subtitle={payload.curator}
        artworkUrl={payload.artworkUrl}
        isMine={isMine}
        meta={typeof payload.trackCount === 'number' ? `${payload.trackCount} tracks` : undefined}
        actions={
          <>
            {previews.length > 0 ? (
              <CardActionButton icon="play" label={previewLabel} onPress={handlePreview} isMine={isMine} />
            ) : null}
            <CardActionButton
              icon="add"
              label="Save playlist"
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
