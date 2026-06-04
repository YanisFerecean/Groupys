import { Text, TouchableOpacity, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import OnboardingShell from '../OnboardingShell'

interface MusicIntroStepProps {
  appleAvailable: boolean
  appleUnavailableReason?: string
  progress: [number, number]
  onBack: () => void
  onConnect: () => void
  onManual: () => void
}

export default function MusicIntroStep({
  appleAvailable,
  appleUnavailableReason,
  progress,
  onBack,
  onConnect,
  onManual,
}: MusicIntroStepProps) {
  return (
    <OnboardingShell
      title="Let's find your top tracks"
      subtitle="Connect Apple Music to auto-build your profile, or add your favorites by hand."
      progress={progress}
      onBack={onBack}
      footer={null}
    >
      {appleAvailable ? (
        <TouchableOpacity
          onPress={onConnect}
          activeOpacity={0.9}
          className="mb-4 rounded-3xl bg-primary p-5"
        >
          <View className="flex-row items-center gap-3">
            <MaterialCommunityIcons name="apple" size={30} color={Colors.onPrimary} />
            <Text className="flex-1 text-2xl font-black text-on-primary">Connect Apple Music</Text>
            <View className="rounded-full bg-on-primary/20 px-3 py-1">
              <Text className="text-sm font-bold text-on-primary">Fastest</Text>
            </View>
          </View>
          <Text className="mt-3 text-lg leading-6 text-on-primary/90">
            We&apos;ll pull your top 3 artists, songs and albums automatically. Two taps and you&apos;re done.
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="mb-4 flex-row items-center gap-3 rounded-2xl bg-surface-container px-4 py-3">
          <Ionicons name="information-circle-outline" size={22} color={Colors.onSurfaceVariant} />
          <Text className="flex-1 text-base text-on-surface-variant">
            {appleUnavailableReason ?? 'Apple Music connect isn’t available here — add your favorites below.'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={onManual}
        activeOpacity={0.9}
        className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5"
      >
        <View className="flex-row items-center gap-3">
          <Ionicons name="create-outline" size={28} color={Colors.primary} />
          <Text className="flex-1 text-2xl font-black text-on-surface">
            {appleAvailable ? 'I’ll pick myself' : 'Pick my favorites'}
          </Text>
          <Ionicons name="chevron-forward" size={22} color={Colors.onSurfaceVariant} />
        </View>
        <Text className="mt-3 text-lg leading-6 text-on-surface-variant">
          Search and choose your top 3 artists, songs and albums.
        </Text>
      </TouchableOpacity>
    </OnboardingShell>
  )
}
