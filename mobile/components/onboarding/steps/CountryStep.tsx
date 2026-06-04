import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { CountryPicker } from '@/components/profile/CountryPicker'
import OnboardingShell from '../OnboardingShell'

interface CountryStepProps {
  value: string
  onChange: (country: string) => void
  progress: [number, number]
  onBack: () => void
  onContinue: () => void
  onSkip: () => void
}

export default function CountryStep({
  value,
  onChange,
  progress,
  onBack,
  onContinue,
  onSkip,
}: CountryStepProps) {
  return (
    <OnboardingShell
      title="Where are you tuning in from?"
      subtitle="We use this to surface charts and people near you."
      progress={progress}
      onBack={onBack}
      ctaLabel="Continue"
      onCta={onContinue}
      onSkip={onSkip}
      skipLabel="Skip for now"
    >
      <CountryPicker value={value} onChange={onChange} />
      {value ? (
        <View className="mt-4 flex-row items-center gap-2 self-start rounded-full bg-primary/10 px-4 py-2">
          <Ionicons name="location" size={18} color={Colors.primary} />
          <Text className="text-base font-semibold text-primary">{value}</Text>
        </View>
      ) : null}
    </OnboardingShell>
  )
}
