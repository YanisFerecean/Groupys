import { View, Text } from "react-native";

type TagVariant = "filled" | "outline";

interface TagProps {
  label: string;
  variant?: TagVariant;
}

const variantStyles: Record<TagVariant, string> = {
  filled: "bg-surface-container-high",
  outline: "border border-outline-variant",
};

export default function Tag({ label, variant = "filled" }: TagProps) {
  return (
    <View className={`rounded-full px-3 py-1.5 ${variantStyles[variant]}`}>
      <Text className="text-on-surface text-sm">{label}</Text>
    </View>
  );
}
