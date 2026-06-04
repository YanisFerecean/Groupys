import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import type { TopAlbum, TopArtist, TopSong } from '@/models/ProfileCustomization'
import OnboardingShell from '../OnboardingShell'

interface TasteRevealStepProps {
  displayName: string
  tasteSummary: string
  tags: string[]
  topArtists: TopArtist[]
  topSongs: TopSong[]
  topAlbums: TopAlbum[]
  progress: [number, number]
  onEnter: () => void
}

export default function TasteRevealStep({
  displayName,
  tasteSummary,
  tags,
  topArtists,
  topSongs,
  topAlbums,
  progress,
  onEnter,
}: TasteRevealStepProps) {
  const covers = [
    ...topAlbums.map((a) => a.coverUrl),
    ...topSongs.map((s) => s.coverUrl),
    ...topArtists.map((a) => a.imageUrl),
  ].filter((u): u is string => !!u).slice(0, 5)

  return (
    <OnboardingShell
      title="Your music identity ✨"
      subtitle="This is what makes you, you. Ready to find your people?"
      progress={progress}
      ctaLabel="See who matches your taste"
      onCta={onEnter}
    >
      <Animated.View
        entering={FadeInDown.duration(500)}
        className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Ionicons name="musical-notes" size={24} color={Colors.primary} />
          </View>
          <Text className="flex-1 text-2xl font-black text-on-surface" numberOfLines={1}>
            {displayName || 'You'}
          </Text>
        </View>

        <Text className="mt-4 text-xl font-semibold leading-7 text-on-surface">{tasteSummary}</Text>

        {tags.length > 0 ? (
          <View className="mt-4 flex-row flex-wrap gap-2">
            {tags.slice(0, 6).map((t) => (
              <View key={t} className="rounded-full bg-primary/10 px-3 py-1.5">
                <Text className="text-base font-bold text-primary">{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {covers.length > 0 ? (
          <View className="mt-5 flex-row gap-2">
            {covers.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: 52, height: 52, borderRadius: 10 }}
                contentFit="cover"
              />
            ))}
          </View>
        ) : null}
      </Animated.View>
    </OnboardingShell>
  )
}
