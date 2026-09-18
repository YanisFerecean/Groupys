import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { MediaMusicOverlay } from '@/components/camera/MediaMusicOverlay'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'
import MediaLightbox from '@/components/ui/MediaLightbox'
import VideoThumbnail from '@/components/ui/VideoThumbnail'
import { Colors } from '@/constants/colors'
import { useSnippetPlayback } from '@/hooks/useSnippetPlayback'
import { fitMediaSize, normalizeMediaUrl } from '@/lib/media'
import { isMediaMusicAttachment } from '@/models/ChatPayloads'

const GLASS = isLiquidGlassAvailable()

function payloadNumber(payload: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const value = payload?.[key]
  return typeof value === 'number' && value > 0 ? value : undefined
}

/** Uploaded video renderer. Tappable tile at the video's true aspect ratio; tap to play fullscreen. */
export function VideoMessage({ message, isMine, onLongPress }: MessageRendererProps) {
  const videoUrl = normalizeMediaUrl(message.mediaUrl)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const music = isMediaMusicAttachment(message.payload?.music) ? message.payload.music : null
  const snippet = useSnippetPlayback(music)

  if (!videoUrl) return null

  // True aspect from the send-time payload; default to 16:9 when unknown (older messages).
  const size = fitMediaSize(payloadNumber(message.payload, 'width'), payloadNumber(message.payload, 'height'), 16 / 9)
  const mime = typeof message.payload?.mime === 'string' ? (message.payload.mime as string) : 'video/mp4'

  const tile = (
    <View>
      <VideoThumbnail
        url={videoUrl}
        width={size.width}
        height={size.height}
        autoplay={false}
        muted
        showPlaybackOverlay
        rounded
      />
      {music ? (
        <MediaMusicOverlay
          music={music}
          containerWidth={size.width}
          containerHeight={size.height}
          isPlaying={snippet.isPlaying}
          progress={snippet.progress}
          onPlayToggle={snippet.canPlay ? snippet.toggle : undefined}
        />
      ) : null}
    </View>
  )

  const sentTint = 'rgba(186, 0, 43, 0.45)'
  const receivedTint = 'rgba(255, 255, 255, 0.15)'

  return (
    <>
      <Pressable onPress={() => setLightboxOpen(true)} onLongPress={onLongPress} delayLongPress={300}>
        {GLASS ? (
          <GlassView
            tintColor={isMine ? sentTint : receivedTint}
            style={{
              borderRadius: 24,
              borderBottomRightRadius: isMine ? 6 : 24,
              borderBottomLeftRadius: isMine ? 24 : 6,
              padding: 4,
            }}
          >
            {tile}
          </GlassView>
        ) : (
          <View
            className={isMine ? 'rounded-[24px] rounded-br-md p-1' : 'rounded-[24px] rounded-bl-md p-1'}
            style={{ backgroundColor: isMine ? Colors.primary : Colors.surfaceContainer }}
          >
            {tile}
          </View>
        )}
      </Pressable>

      <MediaLightbox
        visible={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        allMedia={[{ url: videoUrl, type: mime }]}
        initialIndex={0}
      />
    </>
  )
}
