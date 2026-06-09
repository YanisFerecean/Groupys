import { Image } from 'expo-image'
import { View } from 'react-native'

import type { MessageRendererProps } from '@/components/chat/messageRenderers'
import { Colors } from '@/constants/colors'
import { normalizeMediaUrl } from '@/lib/media'

/** Uploaded image renderer (ticket 3.7). */
export function ImageMessage({ message, isMine }: MessageRendererProps) {
  const imageUrl = normalizeMediaUrl(message.mediaUrl)
  if (!imageUrl) return null

  return (
    <View
      className={isMine ? 'rounded-[24px] rounded-br-md p-1' : 'rounded-[24px] rounded-bl-md p-1'}
      style={{ backgroundColor: isMine ? Colors.primary : Colors.surfaceContainer }}
    >
      <Image
        source={{ uri: imageUrl }}
        contentFit="cover"
        transition={150}
        style={{ width: 240, height: 260, borderRadius: 20 }}
      />
    </View>
  )
}
