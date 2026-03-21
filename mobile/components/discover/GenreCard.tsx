import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Genre } from '@/types'

interface GenreCardProps {
  genre: Genre
}

export default function GenreCard({ genre }: GenreCardProps) {
  return (
    <View
      className="flex-1 h-24 rounded-2xl justify-end p-3 overflow-hidden"
      style={{ backgroundColor: genre.color }}
    >
      {/* Decorative icon */}
      <View className="absolute top-3 right-3 opacity-30">
        <Ionicons
          name={genre.icon as any}
          size={52}
          color="#ffffff"
        />
      </View>
      <Text className="font-bold text-lg text-white">{genre.name}</Text>
    </View>
  )
}
