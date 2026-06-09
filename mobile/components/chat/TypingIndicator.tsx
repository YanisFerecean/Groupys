import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Text, View } from 'react-native'
import { Colors } from '@/constants/colors'

const GLASS = isLiquidGlassAvailable()

export function TypingIndicator({ username }: { username?: string | null }) {
  return (
    <View className="mb-3 items-start">
      {username ? (
        <Text className="mb-1 ml-2 text-[11px] font-medium text-on-surface-variant">
          {username} is typing...
        </Text>
      ) : null}
      {GLASS ? (
        <GlassView
          tintColor="rgba(255,255,255,0.18)"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 }}
        >
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: Colors.onSurfaceVariant + '99' }} />
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: Colors.onSurfaceVariant + '99' }} />
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: Colors.onSurfaceVariant + '99' }} />
        </GlassView>
      ) : (
        <View className="flex-row items-center gap-2 rounded-full bg-surface-container px-4 py-3">
          <View className="h-2 w-2 rounded-full bg-on-surface-variant/60" />
          <View className="h-2 w-2 rounded-full bg-on-surface-variant/60" />
          <View className="h-2 w-2 rounded-full bg-on-surface-variant/60" />
        </View>
      )}
    </View>
  )
}
