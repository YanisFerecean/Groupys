import { View, Text } from "react-native";
import { Image } from "expo-image";
import type { Artist } from "@/types";

interface TopArtistsProps {
  artists: Artist[];
}

export default function TopArtists({ artists }: TopArtistsProps) {
  return (
    <View className="flex-row flex-wrap">
      {artists.map((artist) => (
        <View key={artist.id} className="w-1/2 items-center py-3">
          <Image
            source={{ uri: artist.image }}
            className="w-16 h-16 rounded-full"
            contentFit="cover"
          />
          <Text className="font-semibold text-sm text-on-surface mt-2">
            {artist.name}
          </Text>
          <Text className="text-xs text-on-surface-variant">
            {artist.genre}
          </Text>
        </View>
      ))}
    </View>
  );
}
