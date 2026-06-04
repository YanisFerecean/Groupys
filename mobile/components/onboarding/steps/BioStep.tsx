import { Text, TextInput, View } from 'react-native'
import { Colors } from '@/constants/colors'
import OnboardingShell from '../OnboardingShell'

const MAX_BIO = 300

interface BioStepProps {
  value: string
  onChange: (value: string) => void
  progress: [number, number]
  onBack: () => void
  onContinue: () => void
  onSkip: () => void
}

export default function BioStep({
  value,
  onChange,
  progress,
  onBack,
  onContinue,
  onSkip,
}: BioStepProps) {
  return (
    <OnboardingShell
      title="What's your story?"
      subtitle="A line or two about your taste. You can always change it later."
      progress={progress}
      onBack={onBack}
      ctaLabel="Continue"
      onCta={onContinue}
      onSkip={onSkip}
      skipLabel="Skip for now"
    >
      <View className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-4">
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.slice(0, MAX_BIO))}
          placeholder="e.g. Indie kid turned techno head. Always chasing the next great album."
          placeholderTextColor={Colors.onSurfaceVariant}
          multiline
          autoFocus
          textAlignVertical="top"
          className="min-h-[120px] text-lg leading-7 text-on-surface"
        />
      </View>
      <Text className="mt-2 text-right text-base text-on-surface-variant">
        {value.length}/{MAX_BIO}
      </Text>
    </OnboardingShell>
  )
}
