import { Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/constants/legal'

interface LegalLinksProps {
  /** Optional intro sentence shown before the links (e.g. on the sign-up screen). */
  prefix?: string
  className?: string
}

/**
 * Privacy Policy / Terms of Use links. Surfaced on the sign-up screen and in
 * Settings to satisfy App Store Review Guideline 5.1.1.
 */
export default function LegalLinks({ prefix, className }: LegalLinksProps) {
  const open = (url: string) => {
    void WebBrowser.openBrowserAsync(url)
  }

  return (
    <View className={className}>
      <Text className="text-center text-xs leading-5 text-on-surface-variant">
        {prefix ? `${prefix} ` : ''}
        <Text className="font-semibold text-primary" onPress={() => open(TERMS_OF_SERVICE_URL)}>
          Terms of Use
        </Text>
        {' and '}
        <Text className="font-semibold text-primary" onPress={() => open(PRIVACY_POLICY_URL)}>
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  )
}
