import { ActivityIndicator, View } from 'react-native'
import { Colors } from '@/constants/colors'

export default function FullscreenSpinner() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <ActivityIndicator color={Colors.primary} />
    </View>
  )
}
