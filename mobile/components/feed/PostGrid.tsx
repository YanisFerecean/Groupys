import { View, Text } from "react-native";
import { Image } from "expo-image";
import type { Post } from "@/types";

interface PostGridProps {
  posts: Post[];
}

export default function PostGrid({ posts }: PostGridProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {posts.map((post) => (
        <View key={post.id} className="w-[48%] gap-1">
          <Image
            source={post.image}
            className="w-full rounded-xl aspect-square"
            contentFit="cover"
          />
          <Text
            className="text-sm font-semibold text-on-surface"
            numberOfLines={2}
          >
            {post.title}
          </Text>
          <Text className="text-xs text-on-surface-variant">
            Shared by {post.author}
          </Text>
        </View>
      ))}
    </View>
  );
}
