import { Platform } from 'react-native'

interface NativeButtonProps {
  label: string
  onPress: () => void
}

let SwiftUIButton: React.ComponentType<NativeButtonProps> | null = null

if (Platform.OS === 'ios') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Button, Host } = require('@expo/ui/swift-ui')
  const NativeSwiftUIButton = ({ label, onPress }: NativeButtonProps) => (
    <Host matchContents>
      <Button label={label} onPress={onPress} />
    </Host>
  )
  NativeSwiftUIButton.displayName = 'NativeSwiftUIButton'
  SwiftUIButton = NativeSwiftUIButton
}

export default function NativeButton({ label, onPress }: NativeButtonProps) {
  if (!SwiftUIButton) return null
  return <SwiftUIButton label={label} onPress={onPress} />
}
