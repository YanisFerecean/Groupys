import { View, Text } from "react-native";
import { Image } from "expo-image";
import StatBox from "@/components/ui/StatBox";
import type { UserProfile } from "@/types";

interface ProfileHeaderProps {
  profile: UserProfile;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <View className="items-center px-6 pt-6">
      <Image
        source={{ uri: profile.image }}
        className="w-24 h-24 rounded-full border-4 border-outline-variant"
        contentFit="cover"
      />
      <Text className="text-2xl font-bold text-on-surface mt-4">
        {profile.name}
      </Text>
      <Text className="text-on-surface-variant text-sm text-center mt-1">
        {profile.bio}
      </Text>
      <View className="flex-row gap-10 mt-4">
        <StatBox value={String(profile.followers)} label="Followers" />
        <StatBox value={String(profile.following)} label="Following" />
      </View>
    </View>
  );
}
