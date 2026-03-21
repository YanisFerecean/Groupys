import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ActionButtonsProps {
  onSkip: () => void;
  onVibe: () => void;
}

export default function ActionButtons({ onSkip, onVibe }: ActionButtonsProps) {
  return (
    <View className="flex-row items-center justify-center gap-10">
      <View className="items-center gap-2">
        <Pressable
          onPress={onSkip}
          className="h-16 w-16 items-center justify-center rounded-full bg-surface-container-high"
        >
          <Ionicons name="close" size={28} color="#1a1c1d" />
        </Pressable>
        <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          SKIP
        </Text>
      </View>

      <View className="items-center gap-2">
        <Pressable
          onPress={onVibe}
          className="h-16 w-16 items-center justify-center rounded-full bg-primary"
        >
          <Ionicons name="heart" size={28} color="#ffffff" />
        </Pressable>
        <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          VIBE
        </Text>
      </View>
    </View>
  );
}
