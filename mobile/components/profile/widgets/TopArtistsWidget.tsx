import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import type { TopArtist } from '@/models/ProfileCustomization'

interface TopArtistsWidgetProps {
  artists?: TopArtist[]
  containerColor?: string
}

export default function TopArtistsWidget({ artists, containerColor }: TopArtistsWidgetProps) {
  const router = useRouter()

  if (!artists?.length) return null

  return (
    <View
      className="rounded-3xl p-5 gap-4"
      style={{ backgroundColor: containerColor ?? '#eeeef0' }}
    >
      <Text className="text-sm font-extrabold uppercase tracking-widest text-on-surface-variant mb-1">
        Top Artists
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 4 }}>
        {artists.map((artist, i) => (
          <TouchableOpacity
            key={i}
            className="items-center gap-2"
            style={{ width: 96 }}
            activeOpacity={0.8}
            onPress={() => {
              if (artist.id) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                router.push({ pathname: '/artist/[id]', params: { id: artist.id } })
              } else {
                console.warn(`Artist "${artist.name}" is missing an ID. Please re-select them in Edit Profile.`)
              }
            }}
          >
            <View className="w-24 h-24 rounded-full overflow-hidden bg-surface-container-high border-2 border-white/20">
              {artist.imageUrl ? (
                <Image
                  source={{ uri: artist.imageUrl }}
                  style={{ width: '100%', height: '100%', borderRadius: 999 }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Text className="text-3xl font-bold text-on-surface-variant">
                    {artist.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-sm font-bold text-on-surface text-center" numberOfLines={1}>
              {artist.name}
            </Text>
            {artist.genre && (
              <Text className="text-xs text-on-surface-variant text-center -mt-1" numberOfLines={1}>
                {artist.genre}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}
