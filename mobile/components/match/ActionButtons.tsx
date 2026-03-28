import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ActionButtonsProps {
  onPass: () => void;
  onLike: () => void;
  disabled?: boolean;
}

export default function ActionButtons({ onPass, onLike, disabled }: ActionButtonsProps) {
  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      style={disabled ? { opacity: 0.4 } : undefined}
      className="flex-row items-center justify-center gap-10"
    >
      <View className="items-center gap-2">
        <Pressable
          onPress={onPass}
          className="h-16 w-16 items-center justify-center rounded-full bg-surface-container-high"
        >
          <Ionicons name="close" size={28} color="#1a1c1d" />
        </Pressable>
        <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          PASS
        </Text>
      </View>

      <View className="items-center gap-2">
        <Pressable
          onPress={onLike}
          className="h-16 w-16 items-center justify-center rounded-full bg-primary"
        >
          <Ionicons name="heart-outline" size={26} color="#ffffff" />
        </Pressable>
        <Text className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          LIKE
        </Text>
      </View>
    </View>
  );
}
