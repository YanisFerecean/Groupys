import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import PrimaryButton from '../PrimaryButton'

const VALUE_PROPS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'sparkles', text: 'Build your music identity in seconds' },
  { icon: 'people', text: 'Match with people who share your taste' },
  { icon: 'chatbubbles', text: 'Join fan communities for what you love' },
]

interface WelcomeStepProps {
  onStart: () => void
}

export default function WelcomeStep({ onStart }: WelcomeStepProps) {
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-surface">
      <LinearGradient
        colors={[Colors.primaryContainer, Colors.secondaryContainer, Colors.surface]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <View
        className="flex-1 justify-between px-6"
        style={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 16 }}
      >
        <View>
          <Text className="text-2xl font-black tracking-tighter text-primary">Groupys</Text>
          <Text className="mt-12 text-5xl font-black leading-[52px] tracking-tighter text-on-surface">
            Your taste,{'\n'}your people.
          </Text>
          <Text className="mt-4 text-xl leading-7 text-on-surface-variant">
            Join thousands of music lovers building profiles around what they actually listen to.
          </Text>

          <View className="mt-10 gap-4">
            {VALUE_PROPS.map((vp) => (
              <View key={vp.text} className="flex-row items-center gap-4">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/15">
                  <Ionicons name={vp.icon} size={22} color={Colors.primary} />
                </View>
                <Text className="flex-1 text-lg font-semibold text-on-surface">{vp.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <PrimaryButton label="Get started" onPress={onStart} />
          <Text className="mt-4 text-center text-base text-on-surface-variant">
            Takes about a minute ✨
          </Text>
        </View>
      </View>
    </View>
  )
}
