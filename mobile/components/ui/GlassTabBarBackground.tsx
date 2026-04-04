import { BlurView } from 'expo-blur'
import { Host, Rectangle } from '@expo/ui/swift-ui'
import { glassEffect } from '@expo/ui/swift-ui/modifiers'
import { Platform, StyleSheet } from 'react-native'

export function GlassTabBarBackground() {
  if (Platform.OS !== 'ios') {
    return <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
  }

  return (
    <Host style={StyleSheet.absoluteFill} useViewportSizeMeasurement>
      <Rectangle modifiers={[glassEffect({ glass: { variant: 'regular' } })]} />
    </Host>
  )
}
