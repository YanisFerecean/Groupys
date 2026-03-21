import { View, Text } from "react-native";
import { Image } from "expo-image";
import type { Artist } from "@/types";

interface TrendingArtistCardProps {
  artist: Artist;
}

export default function TrendingArtistCard({ artist }: TrendingArtistCardProps) {
  return (
    <View className="items-center">
      <Image
        source={artist.image}
        className="w-36 h-36 rounded-full"
        contentFit="cover"
      />
      <Text className="text-base font-bold mt-2 text-on-surface">{artist.name}</Text>
      <Text className="text-sm uppercase text-on-surface-variant">
        {artist.role}
      </Text>
    </View>
  );
}
