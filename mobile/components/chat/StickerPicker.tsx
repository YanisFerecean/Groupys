import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'
import { fetchStickers, type StickerCatalogItem } from '@/lib/chat-api'

interface StickerPickerProps {
  visible: boolean
  onClose: () => void
  onSelect: (sticker: StickerCatalogItem) => void
}

/** Server-catalog sticker grid (ticket 3.9). */
export function StickerPicker({ visible, onClose, onSelect }: StickerPickerProps) {
  const { getToken } = useAuth()
  const [stickers, setStickers] = useState<StickerCatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!visible || stickers.length > 0) return
    let cancelled = false
    setIsLoading(true)
    void getToken()
      .then(token => fetchStickers(token))
      .then(items => {
        if (!cancelled) setStickers(items)
      })
      .catch(() => {
        if (!cancelled) setStickers([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [getToken, stickers.length, visible])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-surface px-4 pt-4">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-on-surface">Stickers</Text>
            <Text className="text-[13px] text-on-surface-variant">Groupys classics</Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={stickers}
            numColumns={3}
            keyExtractor={item => item.id}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onSelect(item)}
                className="flex-1 items-center justify-center rounded-2xl bg-surface-container p-3"
                accessibilityLabel={`Send ${item.name} sticker`}
              >
                <Image source={{ uri: item.url }} contentFit="contain" style={{ width: 72, height: 72 }} />
                <Text className="mt-1 text-center text-[11px] font-semibold text-on-surface-variant" numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={(
              <Text className="mt-12 text-center text-on-surface-variant">Stickers are unavailable.</Text>
            )}
          />
        )}
      </View>
    </Modal>
  )
}
