import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Image, View } from 'react-native'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { Colors } from '@/constants/colors'

interface VideoThumbnailProps {
  url: string
  width: number | string
  height?: number
}

export default function VideoThumbnail({ url, width, height = 200 }: VideoThumbnailProps) {
  const [thumbUri, setThumbUri] = useState<string | null>(null)

  useEffect(() => {
    VideoThumbnails.getThumbnailAsync(url, { time: 0 })
      .then((r) => setThumbUri(r.uri))
      .catch(() => {})
  }, [url])

  return (
    <View style={{ width: width as any, height }} className="rounded-xl overflow-hidden bg-surface-container-high">
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="videocam" size={32} color={Colors.onSurfaceVariant} />
        </View>
      )}
      <View className="absolute inset-0 items-center justify-center">
        <View className="w-12 h-12 rounded-full bg-black/50 items-center justify-center border border-white/30">
          <Ionicons name="play" size={22} color="white" style={{ marginLeft: 3 }} />
        </View>
      </View>
    </View>
  )
}
