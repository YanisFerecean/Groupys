import { View, Text } from "react-native";

type BadgeVariant = "primary" | "dark";

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary",
  dark: "bg-on-surface",
};

export default function Badge({ text, variant = "primary" }: BadgeProps) {
  return (
    <View className={`rounded-full px-3 py-1 ${variantStyles[variant]}`}>
      <Text className="text-white text-xs font-semibold">{text}</Text>
    </View>
  );
}
