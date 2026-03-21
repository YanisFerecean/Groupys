import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import type { Artist } from "@/types";

interface ArtistSpotlightProps {
  artist: Artist;
}

export default function ArtistSpotlight({ artist }: ArtistSpotlightProps) {
  return (
    <View className="items-center gap-3 py-4">
      <Image
        source={artist.image}
        className="h-20 w-20 rounded-full"
        contentFit="cover"
      />

      <Text className="text-xs uppercase tracking-widest text-on-surface-variant">
        ARTIST SPOTLIGHT
      </Text>

      <Text className="text-base font-bold text-on-surface">{artist.name}</Text>

      {artist.bio && (
        <Text className="text-center text-sm text-on-surface-variant">
          {artist.bio}
        </Text>
      )}

      <Pressable className="rounded-full bg-primary px-6 py-2">
        <Text className="text-sm font-semibold text-white">Follow Artist</Text>
      </Pressable>
    </View>
  );
}
