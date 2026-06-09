import { Image } from 'expo-image'
import { Linking, Text, TouchableOpacity, View } from 'react-native'

import type { MessageRendererProps } from '@/components/chat/messageRenderers'
import { Colors } from '@/constants/colors'
import { isLinkPreviewPayload } from '@/models/ChatPayloads'

/** OpenGraph link card renderer (ticket 3.7). */
export function LinkPreviewMessage({ message, isMine }: MessageRendererProps) {
  const payload = message.payload
  if (!isLinkPreviewPayload(payload)) return null

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => {
        void Linking.openURL(payload.url).catch(() => {})
      }}
      className="max-w-[300px] overflow-hidden rounded-[24px]"
      style={{ backgroundColor: isMine ? Colors.primary : Colors.surfaceContainer }}
    >
      {payload.imageUrl ? (
        <Image
          source={{ uri: payload.imageUrl }}
          contentFit="cover"
          transition={150}
          style={{ width: 300, height: 150 }}
        />
      ) : null}
      <View className="gap-1 px-4 py-3">
        {payload.siteName ? (
          <Text
            className={`text-[11px] font-bold uppercase ${isMine ? 'text-on-primary/70' : 'text-on-surface-variant'}`}
            numberOfLines={1}
          >
            {payload.siteName}
          </Text>
        ) : null}
        <Text
          className={`text-[15px] font-bold ${isMine ? 'text-on-primary' : 'text-on-surface'}`}
          numberOfLines={2}
        >
          {payload.title}
        </Text>
        {payload.description ? (
          <Text
            className={`text-[13px] ${isMine ? 'text-on-primary/80' : 'text-on-surface-variant'}`}
            numberOfLines={3}
          >
            {payload.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}
