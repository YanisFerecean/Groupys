import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ListeningMetric } from "@/types";

interface ListeningProfileProps {
  metrics: ListeningMetric[];
}

export default function ListeningProfile({ metrics }: ListeningProfileProps) {
  const main = metrics[0];
  const secondary = metrics[1];
  const tertiary = metrics[2];

  return (
    <View className="flex-row gap-3">
      {/* Large card on the left */}
      <View className="flex-1 bg-surface-container-low rounded-2xl p-4 justify-between">
        {main && (
          <>
            <Ionicons
              name={main.icon as keyof typeof Ionicons.glyphMap}
              size={28}
              color="#ba002b"
            />
            <View className="mt-4">
              <Text className="text-on-surface text-lg font-bold">
                {main.label}
              </Text>
              <Text className="text-primary text-xs font-semibold mt-1">
                {main.value}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Right column */}
      <View className="flex-1 gap-3">
        {secondary && (
          <View className="bg-surface-container-low rounded-2xl p-3 flex-1 justify-between">
            <Ionicons
              name={secondary.icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color="#ba002b"
            />
            <View className="mt-2">
              <Text className="text-on-surface text-sm font-bold">
                {secondary.label}
              </Text>
              <Text className="text-primary text-xs font-semibold mt-0.5">
                {secondary.value}
              </Text>
            </View>
          </View>
        )}
        {tertiary && (
          <View className="bg-surface-container-low rounded-2xl p-3 flex-1 justify-between">
            <Ionicons
              name={tertiary.icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color="#ba002b"
            />
            <View className="mt-2">
              <Text className="text-on-surface text-sm font-bold">
                {tertiary.label}
              </Text>
              <Text className="text-primary text-xs font-semibold mt-0.5">
                {tertiary.value}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
