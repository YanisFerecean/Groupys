import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import type { TopAlbum, TopArtist, TopSong } from '@/models/ProfileCustomization'
import OnboardingShell from '../OnboardingShell'
import PrimaryButton from '../PrimaryButton'

interface MusicReviewStepProps {
  topArtists: TopArtist[]
  topSongs: TopSong[]
  topAlbums: TopAlbum[]
  saving: boolean
  progress: [number, number]
  onBack: () => void
  onLove: () => void
  onPickManually: () => void
}

interface Row {
  key: string
  title: string
  subtitle?: string
  image?: string
  rounded?: boolean
}

function Section({ heading, rows }: { heading: string; rows: Row[] }) {
  if (rows.length === 0) return null
  return (
    <View className="mb-6">
      <Text className="mb-3 text-sm font-bold uppercase tracking-wider text-on-surface-variant">
        {heading}
      </Text>
      <View className="gap-2.5">
        {rows.map((r) => (
          <View key={r.key} className="flex-row items-center gap-3 rounded-2xl bg-surface-container p-3">
            {r.image ? (
              <Image
                source={{ uri: r.image }}
                style={{ width: 48, height: 48, borderRadius: r.rounded ? 24 : 10 }}
                contentFit="cover"
              />
            ) : (
              <View
                className="items-center justify-center bg-surface-container-high"
                style={{ width: 48, height: 48, borderRadius: r.rounded ? 24 : 10 }}
              >
                <Ionicons name="musical-notes" size={22} color={Colors.onSurfaceVariant} />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-lg font-bold text-on-surface" numberOfLines={1}>
                {r.title}
              </Text>
              {r.subtitle ? (
                <Text className="text-base text-on-surface-variant" numberOfLines={1}>
                  {r.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

export default function MusicReviewStep({
  topArtists,
  topSongs,
  topAlbums,
  saving,
  progress,
  onBack,
  onLove,
  onPickManually,
}: MusicReviewStepProps) {
  return (
    <OnboardingShell
      title="Here's your top 3"
      subtitle="Straight from your Apple Music. Love it, or fine-tune it yourself?"
      progress={progress}
      onBack={onBack}
      footer={
        <View className="gap-3">
          <PrimaryButton label="Love it 🔥" onPress={onLove} loading={saving} />
          <PrimaryButton label="Let me pick myself" variant="subtle" onPress={onPickManually} disabled={saving} />
        </View>
      }
    >
      <Section
        heading="Top artists"
        rows={topArtists.map((a, i) => ({
          key: `ar-${i}`,
          title: a.name,
          subtitle: a.genre,
          image: a.imageUrl,
          rounded: true,
        }))}
      />
      <Section
        heading="Top songs"
        rows={topSongs.map((s, i) => ({
          key: `so-${i}`,
          title: s.title,
          subtitle: s.artist,
          image: s.coverUrl,
        }))}
      />
      <Section
        heading="Top albums"
        rows={topAlbums.map((a, i) => ({
          key: `al-${i}`,
          title: a.title,
          subtitle: a.artist,
          image: a.coverUrl,
        }))}
      />
    </OnboardingShell>
  )
}
