import { Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { Colors } from '@/constants/colors'

interface CardActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  /** Greyed + still pressable (press shows the upsell sheet). */
  disabled?: boolean
  isMine?: boolean
}

/** Compact pill action used in music card action slots (ticket 0.3). */
export function CardActionButton({ icon, label, onPress, disabled = false, isMine = false }: CardActionButtonProps) {
  const tint = isMine ? Colors.onPrimary : Colors.onSurface
  return (
    <TouchableOpacity
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{
        backgroundColor: isMine ? 'rgba(255,255,255,0.18)' : Colors.surfaceContainerHighest,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Ionicons name={icon} size={15} color={tint} />
      <Text className="text-[13px] font-semibold" style={{ color: tint }}>{label}</Text>
    </TouchableOpacity>
  )
}
