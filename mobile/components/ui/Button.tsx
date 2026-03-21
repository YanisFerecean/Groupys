import { TouchableOpacity, Text } from "react-native";

type ButtonVariant = "primary" | "secondary" | "tertiary";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary",
  secondary: "bg-surface-container-high",
  tertiary: "bg-transparent",
};

const textStyles: Record<ButtonVariant, string> = {
  primary: "text-on-primary",
  secondary: "text-on-surface",
  tertiary: "text-primary",
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  className = "",
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`rounded-full px-6 py-3 items-center justify-center ${variantStyles[variant]} ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <Text className={`font-semibold text-base ${textStyles[variant]}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
