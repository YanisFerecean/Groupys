import { Ionicons } from '@expo/vector-icons'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'
import type { Message } from '@/models/Chat'

const GLASS = isLiquidGlassAvailable()

interface PinnedMessageBarProps {
  pins: Message[]
  onPress: (messageId: string) => void
}

function pinLabel(message: Message): string {
  if (message.messageType?.toUpperCase() === 'COLLAB_PLAYLIST') {
    const title = typeof message.payload?.title === 'string' ? message.payload.title : 'Collaborative playlist'
    const count = typeof message.payload?.trackCount === 'number' ? message.payload.trackCount : 0
    return `${title} · ${count} ${count === 1 ? 'track' : 'tracks'}`
  }
  if (message.content?.trim()) {
    return message.content.trim()
  }
  return message.messageType || 'Pinned message'
}

/** Compact pinned-message jump bar shown directly below the chat header. */
export function PinnedMessageBar({ pins, onPress }: PinnedMessageBarProps) {
  const pin = pins[0]
  if (!pin) return null

  if (GLASS) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Jump to pinned message: ${pinLabel(pin)}`}
        onPress={() => onPress(pin.id)}
      >
        <GlassView
          tintColor={`${Colors.primary}22`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          <GlassView
            tintColor={`${Colors.primary}33`}
            style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="pin" size={16} color={Colors.primary} />
          </GlassView>
          <View className="flex-1">
            <Text className="text-xs font-bold text-primary">
              Pinned message{pins.length > 1 ? ` · ${pins.length}` : ''}
            </Text>
            <Text className="text-sm font-medium text-on-surface" numberOfLines={1}>
              {pinLabel(pin)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={Colors.onSurfaceVariant} />
        </GlassView>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Jump to pinned message: ${pinLabel(pin)}`}
      onPress={() => onPress(pin.id)}
      className="flex-row items-center gap-3 border-b border-surface-container-high bg-surface-container px-4 py-2.5"
    >
      <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Ionicons name="pin" size={16} color={Colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-bold text-primary">
          Pinned message{pins.length > 1 ? ` · ${pins.length}` : ''}
        </Text>
        <Text className="text-sm font-medium text-on-surface" numberOfLines={1}>
          {pinLabel(pin)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={Colors.onSurfaceVariant} />
    </TouchableOpacity>
  )
}
