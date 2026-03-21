import { View, Text } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { AlbumOfWeek as AlbumOfWeekType } from "@/types";

interface AlbumOfWeekProps {
  album: AlbumOfWeekType;
}

export default function AlbumOfWeek({ album }: AlbumOfWeekProps) {
  return (
    <View className="rounded-2xl overflow-hidden">
      <View className="aspect-square">
        <Image
          source={{ uri: album.image }}
          className="absolute inset-0 w-full h-full rounded-2xl"
          contentFit="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          className="absolute inset-0 rounded-2xl"
        />
        <View className="absolute bottom-0 left-0 right-0 p-4">
          <Text className="text-white text-xs uppercase tracking-wider mb-1">
            FEATURED COLLECTION
          </Text>
          <Text className="text-white text-2xl font-bold">{album.title}</Text>
          <Text className="text-white/80 text-sm mt-0.5">{album.artist}</Text>
        </View>
      </View>
    </View>
  );
}
