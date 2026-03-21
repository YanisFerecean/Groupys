import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

interface FABProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
}

export default function FAB({ icon, onPress }: FABProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
    >
      <Ionicons name={icon} size={24} color="#ffffff" />
    </TouchableOpacity>
  );
}
