import { View, Text, TouchableOpacity } from "react-native";

interface CTAButtonsProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function CTAButtons({ onGetStarted, onLogin }: CTAButtonsProps) {
  return (
    <View className="gap-3">
      <TouchableOpacity
        className="bg-primary rounded-2xl py-4 items-center"
        onPress={onGetStarted}
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold text-base">Get Started</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="bg-surface-container-high rounded-2xl py-4 items-center"
        onPress={onLogin}
        activeOpacity={0.8}
      >
        <Text className="text-on-surface font-semibold text-base">Login</Text>
      </TouchableOpacity>
    </View>
  );
}
