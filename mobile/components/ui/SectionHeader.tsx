import { View, Text, TouchableOpacity } from "react-native";

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onAction?: () => void;
}

export default function SectionHeader({
  title,
  actionText,
  onAction,
}: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-on-surface text-2xl font-bold">{title}</Text>
      {actionText && (
        <TouchableOpacity onPress={onAction}>
          <Text className="text-primary text-sm font-medium">{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
