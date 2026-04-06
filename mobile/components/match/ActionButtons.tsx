import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Colors } from '@/constants/colors'

interface ActionButtonsProps {
  onPass: () => void
  onLike: () => void
  disabled?: boolean
}

export default function ActionButtons({ onPass, onLike, disabled }: ActionButtonsProps) {
  const useGlass = isLiquidGlassAvailable()

  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      style={disabled ? { opacity: 0.4 } : undefined}
      className="flex-row items-center justify-center gap-10"
    >
      <View className="items-center gap-2">
        {useGlass ? (
          <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
            <Pressable
              onPress={onPass}
              className="h-16 w-16 items-center justify-center rounded-full"
            >
              <Ionicons name="close" size={28} color={Colors.onSurface} />
            </Pressable>
          </GlassView>
        ) : (
          <Pressable
            onPress={onPass}
            className="h-16 w-16 items-center justify-center rounded-full bg-surface-container-high"
          >
            <Ionicons name="close" size={28} color={Colors.onSurface} />
          </Pressable>
        )}
        <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          PASS
        </Text>
      </View>

      <View className="items-center gap-2">
        {useGlass ? (
          <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
            <Pressable
              onPress={onLike}
              className="h-16 w-16 items-center justify-center rounded-full"
            >
              <Ionicons name="heart-outline" size={26} color={Colors.primary} />
            </Pressable>
          </GlassView>
        ) : (
          <Pressable
            onPress={onLike}
            className="h-16 w-16 items-center justify-center rounded-full bg-primary"
          >
            <Ionicons name="heart-outline" size={26} color="#ffffff" />
          </Pressable>
        )}
        <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          LIKE
        </Text>
      </View>
    </View>
  )
}
