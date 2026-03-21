import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InsightRowProps {
  similarArtists: string[];
  sharedGenres: string[];
}

export default function InsightRow({
  similarArtists,
  sharedGenres,
}: InsightRowProps) {
  return (
    <View className="flex-row gap-4 px-1">
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="radio-outline" size={14} color="#5d3f3f" />
          <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            SIMILAR ARTISTS
          </Text>
        </View>
        <Text className="text-sm text-on-surface">
          {similarArtists.join(", ")}
        </Text>
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="headset-outline" size={14} color="#5d3f3f" />
          <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            SHARED GENRES
          </Text>
        </View>
        <Text className="text-sm text-on-surface">
          {sharedGenres.join(", ")}
        </Text>
      </View>
    </View>
  );
}
