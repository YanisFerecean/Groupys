import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

export default function SearchBar({
  placeholder = "Search",
  value,
  onChangeText,
}: SearchBarProps) {
  return (
    <View className="flex-row items-center bg-surface-container-high rounded-2xl px-4 py-3">
      <Ionicons name="search" size={20} color="#916e6e" />
      <TextInput
        className="flex-1 ml-2 text-on-surface text-base"
        placeholder={placeholder}
        placeholderTextColor="#916e6e"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
