import { Image, type ImageLoadEventData } from 'expo-image'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { MediaMusicOverlay } from '@/components/camera/MediaMusicOverlay'
import type { MessageRendererProps } from '@/components/chat/messageRenderers'
import MediaLightbox from '@/components/ui/MediaLightbox'
import { Colors } from '@/constants/colors'
import { useSnippetPlayback } from '@/hooks/useSnippetPlayback'
import { fitMediaSize, normalizeMediaUrl } from '@/lib/media'
import { isMediaMusicAttachment } from '@/models/ChatPayloads'

const GLASS = isLiquidGlassAvailable()

function payloadNumber(payload: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const value = payload?.[key]
  return typeof value === 'number' && value > 0 ? value : undefined
}

/** Uploaded image renderer (ticket 3.7). Renders at the image's true aspect ratio; tap to view full. */
export function ImageMessage({ message, isMine, onLongPress }: MessageRendererProps) {
  const imageUrl = normalizeMediaUrl(message.mediaUrl)
  // Natural dimensions from the send-time payload; fall back to onLoad for legacy messages.
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const music = isMediaMusicAttachment(message.payload?.music) ? message.payload.music : null
  const snippet = useSnippetPlayback(music)

  if (!imageUrl) return null

  const width = payloadNumber(message.payload, 'width') ?? measured?.width
  const height = payloadNumber(message.payload, 'height') ?? measured?.height
  const size = fitMediaSize(width, height, 1)
  const mime = typeof message.payload?.mime === 'string' ? (message.payload.mime as string) : 'image/jpeg'

  const onLoad = (e: ImageLoadEventData) => {
    if (!payloadNumber(message.payload, 'width') && e.source?.width && e.source?.height) {
      setMeasured({ width: e.source.width, height: e.source.height })
    }
  }

  const image = (
    <View>
      <Image
        source={{ uri: imageUrl }}
        contentFit="cover"
        transition={150}
        onLoad={onLoad}
        style={{ width: size.width, height: size.height, borderRadius: 20 }}
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
            {image}
          </GlassView>
        ) : (
          <View
            className={isMine ? 'rounded-[24px] rounded-br-md p-1' : 'rounded-[24px] rounded-bl-md p-1'}
            style={{ backgroundColor: isMine ? Colors.primary : Colors.surfaceContainer }}
          >
            {image}
          </View>
        )}
      </Pressable>

      <MediaLightbox
        visible={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        allMedia={[{ url: imageUrl, type: mime }]}
        initialIndex={0}
      />
    </>
  )
}
