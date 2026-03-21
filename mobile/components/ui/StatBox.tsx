import { View, Text } from "react-native";

interface StatBoxProps {
  value: string;
  label: string;
}

export default function StatBox({ value, label }: StatBoxProps) {
  return (
    <View className="items-center">
      <Text className="text-on-surface text-xl font-bold">{value}</Text>
      <Text className="text-on-surface-variant text-xs uppercase tracking-wide mt-0.5">
        {label}
      </Text>
    </View>
  );
}
