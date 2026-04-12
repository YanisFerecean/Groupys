import { View, Text } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Tag from "@/components/ui/Tag";
import type { MatchProfile } from "@/types";

interface MatchCardProps {
  profile: MatchProfile;
}

export default function MatchCard({ profile }: MatchCardProps) {
  return (
    <View className="gap-3">
      <View className="overflow-hidden rounded-3xl">
        <View className="relative">
          <Image
            source={profile.image}
            className="w-full aspect-[3/4]"
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            className="absolute bottom-0 left-0 right-0 h-1/3"
          />
          <View className="absolute bottom-0 left-0 right-0 p-5 gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wider text-white/70">
              SYNTHESIZED GROOVE
            </Text>
            <Text className="text-2xl font-bold text-white">
              {profile.name}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 px-1">
        {profile.genres.map((genre) => (
          <Tag key={genre} label={genre} />
        ))}
      </View>
    </View>
  );
}
