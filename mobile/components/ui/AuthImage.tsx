import { useState } from 'react'
import { Image, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ImageResizeMode, StyleProp, ImageStyle } from 'react-native'

interface AuthImageProps {
  uri: string
  token: string | null
  className?: string
  style?: StyleProp<ImageStyle>
  resizeMode?: ImageResizeMode
}

export default function AuthImage({
  uri,
  token,
  className,
  style,
  resizeMode = 'cover',
}: AuthImageProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <View
        className={`bg-surface-container-high items-center justify-center ${className ?? ''}`}
        style={style}
      >
        <Ionicons name="image-outline" size={32} color="#999" />
      </View>
    )
  }

  return (
    <Image
      source={{
        uri,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }}
      className={className}
      style={style}
      resizeMode={resizeMode}
      onError={() => setError(true)}
    />
  )
}
