import { useRouter } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MusicPeopleGraphic from '@/components/landing/MusicPeopleGraphic'

export default function LandingScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View
      className="flex-1 justify-between bg-surface px-6"
      style={{ paddingTop: insets.top + 80, paddingBottom: insets.bottom + 32 }}
    >
      {/* Hero */}
      <View>
        <Text className="mb-6 text-5xl font-extrabold tracking-tighter text-primary">
          Groupys
        </Text>
        <Text className="text-4xl font-extrabold tracking-tighter text-on-surface">
          Music is{'\n'}better together.
        </Text>
        <Text className="mt-3 text-lg text-on-surface-variant">
          Discover, connect, and share.
        </Text>
      </View>

      {/* Animated illustration */}
      <View className="flex-1 items-center justify-center mb-5">
        <MusicPeopleGraphic />
      </View>

      {/* CTAs */}
      <View className="gap-3 mt-8">
        <TouchableOpacity
          className="items-center rounded-2xl bg-primary py-4 active:opacity-90"
          onPress={() => router.push('/(auth)/sign-in')}
        >
          <Text className="text-base font-semibold text-white">
            Continue with SSO
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center rounded-2xl bg-surface-container-high py-4 active:opacity-90"
          onPress={() => router.push('/(auth)/sign-in')}
        >
          <Text className="text-base font-semibold text-on-surface">
            Already have an account?
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
