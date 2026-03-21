import { View, Text } from "react-native";

export default function HeroSection() {
  return (
    <View className="items-center">
      <Text className="text-4xl font-extrabold tracking-tighter text-on-surface text-center">
        Music is better together
      </Text>
      <Text className="text-on-surface-variant text-lg text-center mt-3">
        Discover communities, share experiences, and connect with people who
        love the same music you do.
      </Text>
    </View>
  );
}
