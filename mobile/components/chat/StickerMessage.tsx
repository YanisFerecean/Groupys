import { Image } from 'expo-image'

import type { MessageRendererProps } from '@/components/chat/messageRenderers'
import { isStickerPayload } from '@/models/ChatPayloads'

/** Large borderless sticker renderer (ticket 3.9). */
export function StickerMessage({ message }: MessageRendererProps) {
  const payload = message.payload
  if (!isStickerPayload(payload)) return null

  return (
    <Image
      source={{ uri: payload.url }}
      contentFit="contain"
      transition={120}
      accessibilityLabel={payload.name ? `${payload.name} sticker` : 'Sticker'}
      style={{ width: 180, height: 180 }}
    />
  )
}
