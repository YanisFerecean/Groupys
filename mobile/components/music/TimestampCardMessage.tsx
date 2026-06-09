import { Linking } from 'react-native'

import { TrackCard } from '@/components/music/TrackCard'
import { CardActionButton } from '@/components/music/CardActionButton'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import { isTimestampPayload } from '@/models/ChatPayloads'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'

export function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function appleMusicLink(title: string, artist: string, explicit?: string): string {
  if (explicit && (explicit.startsWith('music://') || explicit.startsWith('http'))) {
    return explicit
  }
  return `https://music.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`.trim())}`
}

/**
 * TIMESTAMP renderer (ticket 4.2): "Listen from m:ss". Tap Open deep-links the track (web links
 * don't carry a position); a 30s preview is offered from the nearest available window.
 */
export function TimestampCardMessage({ message, isMine }: MessageRendererProps) {
  const payload = message.payload
  const preview = usePreviewPlayer()

  if (!isTimestampPayload(payload)) {
    return null
  }

  const { track, positionMs } = payload
  const trackId = `${track.id || message.id}:ts`
  const hasPreview = !!track.previewUrl
  const isActive = preview.isActive(trackId)
  const progress = isActive && preview.durationSec > 0 ? preview.positionSec / preview.durationSec : 0

  return (
    <TrackCard
      title={track.title}
      subtitle={`${track.artist ?? ''}${track.artist ? ' · ' : ''}Listen from ${formatMs(positionMs)}`}
      artworkUrl={track.artworkUrl}
      isMine={isMine}
      hasPreview={hasPreview}
      isPlaying={isActive && preview.isPlaying}
      progress={progress}
      onTogglePreview={hasPreview ? () => preview.toggle(trackId, track.previewUrl!) : undefined}
      actions={
        <CardActionButton
          icon="play-skip-forward"
          label={`Open at ${formatMs(positionMs)}`}
          onPress={() => {
            void Linking.openURL(appleMusicLink(track.title, track.artist ?? '', track.appleMusicUrl)).catch(() => {})
          }}
          isMine={isMine}
        />
      }
    />
  )
}
