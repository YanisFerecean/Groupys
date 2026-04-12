import { type TextInputProps, Text, TextInput, View } from 'react-native'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
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
  const useGlass = isLiquidGlassAvailable()

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </Text>
      {useGlass ? (
        <GlassView style={{ borderRadius: 16, overflow: 'hidden' }}>
          <TextInput
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: Colors.onSurface,
              borderWidth: error ? 1 : 0,
              borderColor: error ? '#f87171' : 'transparent',
              borderRadius: 16,
            }}
            placeholderTextColor={placeholderTextColor}
            {...props}
          />
        </GlassView>
      ) : (
        <TextInput
          className={`rounded-2xl border px-4 py-4 text-base text-on-surface ${
            error ? 'border-red-400 bg-red-50' : 'border-outline-variant bg-surface'
          }`}
          placeholderTextColor={placeholderTextColor}
          {...props}
        />
      )}
      {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}
    </View>
  )
}
