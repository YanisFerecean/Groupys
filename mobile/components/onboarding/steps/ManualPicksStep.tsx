import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import MusicSearchPicker, { type PickItem, type PickerType } from '../MusicSearchPicker'
import OnboardingShell from '../OnboardingShell'

const REQUIRED = 3

interface ManualPicksStepProps {
  artists: PickItem[]
  songs: PickItem[]
  albums: PickItem[]
  onChangeArtists: (items: PickItem[]) => void
  onChangeSongs: (items: PickItem[]) => void
  onChangeAlbums: (items: PickItem[]) => void
  saving: boolean
  progress: [number, number]
  onBack: () => void
  onSave: () => void
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  const done = count >= REQUIRED
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <Text className="text-xl font-black text-on-surface">{label}</Text>
      <View
        className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
          done ? 'bg-primary/10' : 'bg-surface-container-high'
        }`}
      >
        {done ? <Ionicons name="checkmark" size={14} color={Colors.primary} /> : null}
        <Text className={`text-sm font-bold ${done ? 'text-primary' : 'text-on-surface-variant'}`}>
          {count}/{REQUIRED}
        </Text>
      </View>
    </View>
  )
}

export default function ManualPicksStep({
  artists,
  songs,
  albums,
  onChangeArtists,
  onChangeSongs,
  onChangeAlbums,
  saving,
  progress,
  onBack,
  onSave,
}: ManualPicksStepProps) {
  const complete =
    artists.length >= REQUIRED && songs.length >= REQUIRED && albums.length >= REQUIRED

  const sections: {
    label: string
    type: PickerType
    items: PickItem[]
    onChange: (items: PickItem[]) => void
  }[] = [
    { label: 'Top 3 artists', type: 'artist', items: artists, onChange: onChangeArtists },
    { label: 'Top 3 songs', type: 'track', items: songs, onChange: onChangeSongs },
    { label: 'Top 3 albums', type: 'album', items: albums, onChange: onChangeAlbums },
  ]

  return (
    <OnboardingShell
      title="Your top 3"
      subtitle="Add 3 artists, 3 songs and 3 albums that define your taste."
      progress={progress}
      onBack={onBack}
      ctaLabel={complete ? 'Finish' : 'Add 3 of each to finish'}
      onCta={onSave}
      ctaDisabled={!complete}
      ctaLoading={saving}
    >
      <View className="gap-7">
        {sections.map((s) => (
          <View key={s.type}>
            <SectionHeader label={s.label} count={s.items.length} />
            <MusicSearchPicker type={s.type} selected={s.items} onChange={s.onChange} max={REQUIRED} />
          </View>
        ))}
      </View>
    </OnboardingShell>
  )
}
