import { Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { GenrePicker } from '@/components/profile/GenrePicker'
import OnboardingShell from '../OnboardingShell'

const QUICK_GENRES: { name: string; emoji: string }[] = [
  { name: 'Pop', emoji: '🎤' },
  { name: 'Hip-Hop', emoji: '🎧' },
  { name: 'R&B', emoji: '🎹' },
  { name: 'Rock', emoji: '🎸' },
  { name: 'Electronic', emoji: '⚡' },
  { name: 'Jazz', emoji: '🎷' },
  { name: 'Classical', emoji: '🎻' },
  { name: 'Country', emoji: '🤠' },
  { name: 'Reggae', emoji: '🌿' },
  { name: 'Metal', emoji: '🤘' },
  { name: 'Soul', emoji: '✨' },
  { name: 'Latin', emoji: '💃' },
  { name: 'Indie', emoji: '🌙' },
  { name: 'K-Pop', emoji: '🌸' },
]

interface TagsStepProps {
  selected: string[]
  onChange: (tags: string[]) => void
  progress: [number, number]
  onBack: () => void
  onContinue: () => void
}

export default function TagsStep({
  selected,
  onChange,
  progress,
  onBack,
  onContinue,
}: TagsStepProps) {
  const toggle = (name: string) => {
    const exists = selected.some((t) => t.toLowerCase() === name.toLowerCase())
    onChange(exists ? selected.filter((t) => t.toLowerCase() !== name.toLowerCase()) : [...selected, name])
  }

  const add = (name: string) => {
    if (selected.some((t) => t.toLowerCase() === name.toLowerCase())) return
    onChange([...selected, name])
  }

  return (
    <OnboardingShell
      title="What's your vibe?"
      subtitle="Pick the genres you live for. Choose as many as you like — at least one."
      progress={progress}
      onBack={onBack}
      ctaLabel={selected.length > 0 ? `Continue (${selected.length})` : 'Pick at least one'}
      onCta={onContinue}
      ctaDisabled={selected.length === 0}
    >
      {selected.length > 0 ? (
        <View className="mb-5 flex-row flex-wrap gap-2">
          {selected.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => toggle(tag)}
              className="flex-row items-center gap-1.5 rounded-full bg-primary px-4 py-2"
            >
              <Text className="text-base font-bold text-on-primary">{tag}</Text>
              <Ionicons name="close" size={16} color={Colors.onPrimary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View className="mb-5">
        <GenrePicker onSelect={add} />
      </View>

      <View className="flex-row flex-wrap gap-2.5">
        {QUICK_GENRES.map((g) => {
          const active = selected.some((t) => t.toLowerCase() === g.name.toLowerCase())
          return (
            <TouchableOpacity
              key={g.name}
              onPress={() => toggle(g.name)}
              className={`flex-row items-center gap-2 rounded-2xl px-4 py-3 ${
                active ? 'bg-primary' : 'bg-surface-container'
              }`}
            >
              <Text className="text-xl">{g.emoji}</Text>
              <Text
                className={`text-base font-bold ${active ? 'text-on-primary' : 'text-on-surface'}`}
              >
                {g.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </OnboardingShell>
  )
}
