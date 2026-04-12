import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { Colors } from '@/constants/colors'
import { parseWidgets, widgetsToProfile } from '@/lib/api'
import type { SuggestedUser } from '@/models/SuggestedUser'
import { useMemo } from 'react'
import TopArtistsWidget from '@/components/profile/widgets/TopArtistsWidget'
import TopSongsWidget from '@/components/profile/widgets/TopSongsWidget'
import TopAlbumsWidget from '@/components/profile/widgets/TopAlbumsWidget'

interface Props {
  user: SuggestedUser
  onViewProfile?: () => void
  scrollRef?: React.RefObject<ScrollView>
  bottomPadding?: number
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-3xl bg-surface-container-low px-5 py-4 gap-2">
      {children}
    </View>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
      {text}
    </Text>
  )
}

export default function UserHingeProfile({ user, scrollRef, bottomPadding = 20 }: Props) {
  const { width } = useWindowDimensions()
  const vibePercent = Math.round(user.score * 100)
  const photoSize = width - 40
  const displayName = user.displayName ?? user.username

  const profile = useMemo(
    () => widgetsToProfile(parseWidgets(user.widgets ?? null)),
    [user.widgets],
  )

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPadding, gap: 12 }}
    >
      {/* Profile photo */}
      <View
        style={{ width: photoSize, height: photoSize * 1.05 }}
        className="rounded-[28px] overflow-hidden bg-surface-container-highest self-center"
      >
        {user.profileImage ? (
          <Image
            source={{ uri: user.profileImage }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="person" size={80} color={Colors.outlineVariant} />
          </View>
        )}

      </View>

      {/* Name + username */}
      <View className="gap-0.5 px-1">
        <Text className="text-4xl font-extrabold tracking-tight text-on-surface" numberOfLines={1}>
          {displayName}
        </Text>
        <Text className="text-base font-semibold text-on-surface-variant">
          @{user.username}
        </Text>
      </View>

      {/* About / bio */}
      {!!user.bio && (
        <SectionCard>
          <SectionLabel text="About" />
          <Text className="text-[17px] font-medium leading-relaxed text-on-surface">
            {user.bio}
          </Text>
        </SectionCard>
      )}

      {/* Matched Artists */}
      {user.matchedArtists?.length > 0 && (
        <SectionCard>
          <SectionLabel text="Artists you both vibe with" />
          <View className="flex-row flex-wrap gap-2 mt-1">
            {user.matchedArtists.map((artist) => (
              <View key={artist.id} className="rounded-full bg-primary px-4 py-2">
                <Text className="text-sm font-bold text-on-primary">{artist.name}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      {/* User's top albums — widget style */}
      {profile.topAlbums && profile.topAlbums.length > 0 && (
        <TopAlbumsWidget
          albums={profile.topAlbums}
          title={`${displayName.toUpperCase()}'S TOP ALBUM`}
          size="small"
        />
      )}

      {/* User's top artists — widget style */}
      {profile.topArtists && profile.topArtists.length > 0 && (
        <TopArtistsWidget
          artists={profile.topArtists}
          title={`${displayName.toUpperCase()}'S TOP ARTIST`}
          size="small"
        />
      )}

      {/* User's top songs — widget style with audio */}
      {profile.topSongs && profile.topSongs.length > 0 && (
        <TopSongsWidget
          songs={profile.topSongs}
          title={`${displayName.toUpperCase()}'S TOP SONG`}
          size="small"
        />
      )}

      {/* Genres */}
      {user.matchedGenres?.length > 0 && (
        <SectionCard>
          <SectionLabel text="Shared genres" />
          <View className="flex-row flex-wrap gap-2 mt-1">
            {user.matchedGenres.map((genre) => (
              <View
                key={genre.id}
                className="rounded-full border border-outline-variant px-4 py-2"
              >
                <Text className="text-sm font-bold text-on-surface">{genre.name}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      {/* Social context */}
      {(user.mutualFollowCount > 0 || user.sharedCommunityCount > 0 || user.sameCountry) && (
        <SectionCard>
          <SectionLabel text="You two have in common" />
          <View className="gap-3 mt-1">
            {user.mutualFollowCount > 0 && (
              <View className="flex-row items-center gap-3">
                {Platform.OS === 'ios' ? (
                  <View className="h-9 w-9 rounded-full bg-surface-container-high items-center justify-center">
                    <Ionicons name="people" size={18} color={Colors.primary} />
                  </View>
                ) : (
                  <View className="h-9 w-9 rounded-full bg-surface-container-high items-center justify-center">
                    <Ionicons name="people-outline" size={18} color={Colors.primary} />
                  </View>
                )}
                <Text className="text-base font-semibold text-on-surface">
                  {user.mutualFollowCount} mutual {user.mutualFollowCount === 1 ? 'follow' : 'follows'}
                </Text>
              </View>
            )}
            {user.sharedCommunityCount > 0 && (
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 rounded-full bg-surface-container-high items-center justify-center">
                  <Ionicons name="people-circle-outline" size={18} color={Colors.primary} />
                </View>
                <Text className="text-base font-semibold text-on-surface">
                  {user.sharedCommunityCount} shared {user.sharedCommunityCount === 1 ? 'community' : 'communities'}
                </Text>
              </View>
            )}
            {user.sameCountry && (
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 rounded-full bg-surface-container-high items-center justify-center">
                  <Text className="text-lg">🌍</Text>
                </View>
                <Text className="text-base font-semibold text-on-surface">Same country</Text>
              </View>
            )}
          </View>
        </SectionCard>
      )}
    </ScrollView>
  )
}
