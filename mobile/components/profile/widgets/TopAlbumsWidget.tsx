import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { TopAlbum } from '@/models/ProfileCustomization'

interface TopAlbumsWidgetProps {
  albums?: TopAlbum[]
  containerColor?: string
  textColor?: string
  size?: 'small' | 'normal'
  onAlbumPress?: (album: TopAlbum) => void
  userRatingScores?: Record<number, number>
  title?: string
}

export default function TopAlbumsWidget({
  albums,
  containerColor,
  textColor,
  size = 'normal',
  onAlbumPress,
  userRatingScores,
  title,
}: TopAlbumsWidgetProps) {
  if (!albums?.length) return null
  const visibleAlbums = albums.slice(0, size === 'small' ? 1 : 3)

  const handlePress = (album: TopAlbum) => {
    if (!album.id || !onAlbumPress) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onAlbumPress(album)
  }

  return (
    <View
      className="rounded-[28px] p-5 gap-3"
      style={{ backgroundColor: containerColor ?? 'rgba(0,0,0,0.02)' }}
    >
      <Text
        className="text-sm font-extrabold uppercase tracking-widest mb-1 ml-1"
        style={{ color: textColor ?? undefined }}
      >
        {title ?? (size === 'small' ? 'Top Album' : 'Top Albums')}
      </Text>
      {size === 'small' ? (
        <View className="gap-3">
          <TouchableOpacity
            activeOpacity={visibleAlbums[0]?.id && onAlbumPress ? 0.85 : 1}
            onPress={() => handlePress(visibleAlbums[0])}
            disabled={!visibleAlbums[0]?.id || !onAlbumPress}
          >
            <View className="aspect-square rounded-3xl overflow-hidden bg-surface-container-high relative">
              {visibleAlbums[0]?.coverUrl ? (
                <Image
                  source={{ uri: visibleAlbums[0].coverUrl }}
                  style={{ position: 'absolute', top: '-2%', left: '-2%', width: '104%', height: '104%' }}
                  contentFit="cover"
                />
              ) : null}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              {visibleAlbums[0]?.id && userRatingScores?.[visibleAlbums[0].id] !== undefined && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: 20,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Ionicons name="star" size={10} color="#FFD700" />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
              {(userRatingScores[visibleAlbums[0].id] / 2).toFixed(1)}
            </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View className="px-1">
            <Text className="text-[16px] font-bold text-on-surface" style={{ color: textColor ?? undefined }} numberOfLines={1}>
              {visibleAlbums[0]?.title}
            </Text>
            <Text className="mt-1 text-sm text-on-surface-variant" style={{ color: textColor ?? undefined }} numberOfLines={1}>
              {visibleAlbums[0]?.artist}
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {visibleAlbums.map((album, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={album.id && onAlbumPress ? 0.85 : 1}
              onPress={() => handlePress(album)}
              disabled={!album.id || !onAlbumPress}
            >
              <View className="w-[140px] h-[140px] rounded-3xl overflow-hidden bg-surface-container-high shrink-0 relative">
                {album.coverUrl ? (
                  <Image
                    source={{ uri: album.coverUrl }}
                    style={{ position: 'absolute', top: '-2%', left: '-2%', width: '104%', height: '104%' }}
                    contentFit="cover"
                  />
                ) : null}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View className="absolute bottom-0 left-0 right-0 p-3 pt-6">
                  <Text className="text-white font-bold text-[15px]" numberOfLines={2} style={{ lineHeight: 18 }}>
                    {album.title}
                  </Text>
                </View>
                {album.id && userRatingScores?.[album.id] !== undefined && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      borderRadius: 20,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Ionicons name="star" size={10} color="#FFD700" />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
              {(userRatingScores[album.id] / 2).toFixed(1)}
            </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
