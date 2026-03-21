import { View, Text } from "react-native";
import { Image } from "expo-image";
import type { Post } from "@/types";

interface PostListItemProps {
  post: Post;
}

export default function PostListItem({ post }: PostListItemProps) {
  return (
    <View className="flex-row items-center gap-3">
      <Image
        source={post.image}
        className="h-16 w-16 rounded-xl"
        contentFit="cover"
      />

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-1 text-sm font-semibold text-on-surface"
            numberOfLines={1}
          >
            {post.title}
          </Text>
          {post.badge && (
            <View className="rounded-full bg-primary px-2 py-0.5">
              <Text className="text-xs text-white">{post.badge}</Text>
            </View>
          )}
        </View>

        {post.description && (
          <Text
            className="text-xs text-on-surface-variant"
            numberOfLines={2}
          >
            {post.description}
          </Text>
        )}
      </View>
    </View>
  );
}
