import { type TextInputProps, Text, TextInput, View } from 'react-native'
import { Colors } from '@/constants/colors'

interface AuthTextFieldProps extends TextInputProps {
  label: string
  error?: string | null
}

export default function AuthTextField({
  label,
  error,
  placeholderTextColor = Colors.onSurfaceVariant,
  ...props
}: AuthTextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-on-surface">{label}</Text>
      <TextInput
        className={`rounded-2xl border px-4 py-4 text-base text-on-surface ${
          error ? 'border-red-400 bg-red-50' : 'border-outline-variant bg-surface'
        }`}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
      {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}
    </View>
  )
}
