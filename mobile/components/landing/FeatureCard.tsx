import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <View className="bg-surface-container-lowest rounded-2xl p-5">
      <View className="w-10 h-10 bg-surface-container-high rounded-full items-center justify-center">
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color="#ba002b" />
      </View>
      <Text className="font-bold text-lg mt-3 text-on-surface">{title}</Text>
      <Text className="text-on-surface-variant text-sm mt-1">{description}</Text>
    </View>
  );
}
