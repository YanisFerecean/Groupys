import { Text, View } from 'react-native'

export function TypingIndicator({ username }: { username?: string | null }) {
  return (
    <View className="mb-3 items-start">
      {username ? (
        <Text className="mb-1 ml-2 text-[11px] font-medium text-on-surface-variant">
          {username} is typing...
        </Text>
      ) : null}
      <View className="flex-row items-center gap-2 rounded-full bg-surface-container px-4 py-3">
        <View className="h-2 w-2 rounded-full bg-on-surface-variant/60" />
        <View className="h-2 w-2 rounded-full bg-on-surface-variant/60" />
        <View className="h-2 w-2 rounded-full bg-on-surface-variant/60" />
      </View>
    </View>
  )
}
