import { View, Text, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import type { TopAlbum } from '@/models/ProfileCustomization'

interface TopAlbumsWidgetProps {
  albums?: TopAlbum[]
  containerColor?: string
}

export default function TopAlbumsWidget({ albums, containerColor }: TopAlbumsWidgetProps) {
  if (!albums?.length) return null

  return (
    <View
      className="rounded-3xl p-5 gap-4"
      style={{ backgroundColor: containerColor ?? '#eeeef0' }}
    >
      <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
        Top Albums
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {albums.map((album, i) => (
          <View key={i} className="w-32 h-32 rounded-2xl overflow-hidden bg-surface-container-high shrink-0 relative">
            {album.coverUrl ? (
              <Image
                source={{ uri: album.coverUrl }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : null}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 items-center justify-center">
               <Text className="text-white font-bold text-xs" style={{marginTop: -2}}>💿</Text>
            </View>
            <View className="absolute bottom-0 left-0 right-0 p-3">
              <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {album.title}
              </Text>
              <Text className="text-white/80 text-xs" numberOfLines={1}>
                {album.artist}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
