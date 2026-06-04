import { ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import { Colors } from '@/constants/colors'

interface PrimaryButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'subtle'
}

export default function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isPrimary = variant === 'primary'
  const blocked = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={blocked}
      activeOpacity={0.9}
      className={`w-full items-center justify-center rounded-2xl py-4 ${
        isPrimary ? 'bg-primary' : 'bg-surface-container-high'
      }`}
      style={{ opacity: blocked ? 0.5 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? Colors.onPrimary : Colors.primary} />
      ) : (
        <Text
          className={`text-lg font-bold ${isPrimary ? 'text-on-primary' : 'text-on-surface'}`}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  )
}
