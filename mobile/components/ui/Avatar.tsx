import { View, Image } from "react-native";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  image: string;
  size?: AvatarSize;
  showBorder?: boolean;
  className?: string;
}

const sizeMap: Record<AvatarSize, { container: string; image: string; dimension: number }> = {
  sm: { container: "w-8 h-8", image: "w-8 h-8", dimension: 32 },
  md: { container: "w-12 h-12", image: "w-12 h-12", dimension: 48 },
  lg: { container: "w-16 h-16", image: "w-16 h-16", dimension: 64 },
  xl: { container: "w-24 h-24", image: "w-24 h-24", dimension: 96 },
};

export default function Avatar({
  image,
  size = "md",
  showBorder = false,
  className = "",
}: AvatarProps) {
  const s = sizeMap[size];

  if (showBorder) {
    return (
      <View
        className={`${s.container} rounded-full items-center justify-center p-0.5 ${className}`}
        style={{
          backgroundImage: undefined,
          borderWidth: 2,
          borderColor: "transparent",
        }}
      >
        <View
          className="rounded-full overflow-hidden"
          style={{
            width: s.dimension - 4,
            height: s.dimension - 4,
            borderWidth: 2,
            borderColor: "#ba002b",
          }}
        >
          <Image
            source={{ uri: image }}
            className="w-full h-full"
            style={{ width: s.dimension - 8, height: s.dimension - 8 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View className={`${s.container} rounded-full overflow-hidden ${className}`}>
      <Image
        source={{ uri: image }}
        className="w-full h-full"
        style={{ width: s.dimension, height: s.dimension }}
      />
    </View>
  );
}
