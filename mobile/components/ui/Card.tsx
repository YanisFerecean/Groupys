import { View } from "react-native";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <View
      className={`rounded-2xl bg-surface-container-lowest shadow p-4 ${className}`}
    >
      {children}
    </View>
  );
}
