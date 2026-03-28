import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, View } from 'react-native'

interface GlassModalBackdropProps {
  onPress?: () => void
  intensity?: number
  tint?: 'light' | 'dark' | 'default'
}

export default function GlassModalBackdrop({
  onPress,
  intensity = 42,
  tint = 'light',
}: GlassModalBackdropProps) {
  const gradientColors: readonly [string, string, ...string[]] = tint === 'dark'
    ? ['rgba(8, 10, 16, 0.64)', 'rgba(18, 22, 34, 0.44)', 'rgba(186, 0, 43, 0.18)']
    : ['rgba(255, 255, 255, 0.62)', 'rgba(248, 245, 250, 0.34)', 'rgba(186, 0, 43, 0.12)']

  const washColor = tint === 'dark'
    ? 'rgba(6, 8, 12, 0.16)'
    : 'rgba(255, 255, 255, 0.08)'

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: washColor }]} />
      {onPress ? <Pressable onPress={onPress} style={StyleSheet.absoluteFillObject} /> : null}
    </View>
  )
}
