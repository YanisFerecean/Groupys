import { Image } from 'expo-image'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { View } from 'react-native'

import type { MessageRendererProps } from '@/components/chat/messageRenderers'
import { Colors } from '@/constants/colors'
import { normalizeMediaUrl } from '@/lib/media'

const GLASS = isLiquidGlassAvailable()

/** Uploaded image renderer (ticket 3.7). */
export function ImageMessage({ message, isMine }: MessageRendererProps) {
  const imageUrl = normalizeMediaUrl(message.mediaUrl)
  if (!imageUrl) return null

  const sentTint = 'rgba(186, 0, 43, 0.45)'
  const receivedTint = 'rgba(255, 255, 255, 0.15)'

  if (GLASS) {
    return (
      <GlassView
        tintColor={isMine ? sentTint : receivedTint}
        style={{
          borderRadius: 24,
          borderBottomRightRadius: isMine ? 6 : 24,
          borderBottomLeftRadius: isMine ? 24 : 6,
          padding: 4,
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          transition={150}
          style={{ width: 240, height: 260, borderRadius: 20 }}
        />
      </GlassView>
    )
  }

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
