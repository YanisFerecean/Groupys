import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { Post } from "@/types";

interface FeaturedPostProps {
  post: Post;
}

export default function FeaturedPost({ post }: FeaturedPostProps) {
  return (
    <View className="gap-2">
      <View className="relative">
        <Image
          source={post.image}
          className="w-full rounded-2xl aspect-video"
          contentFit="cover"
        />
        {post.badge && (
          <View className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1">
            <Text className="text-xs font-semibold text-white">
              {post.badge}
            </Text>
          </View>
        )}
      </View>

      <Text className="text-lg font-bold text-on-surface">{post.title}</Text>

      <View className="flex-row items-center gap-2">
        <Text className="text-sm text-on-surface-variant">{post.author}</Text>
        <Text className="text-sm text-on-surface-variant">·</Text>
        <Text className="text-sm text-on-surface-variant">{post.timeAgo}</Text>
      </View>

      {post.description && (
        <Text className="text-sm text-on-surface-variant">
          {post.description}
        </Text>
      )}

      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1">
          <Ionicons name="heart-outline" size={18} color="#5d3f3f" />
          <Text className="text-sm text-on-surface-variant">{post.likes}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="chatbubble-outline" size={18} color="#5d3f3f" />
          <Text className="text-sm text-on-surface-variant">
            {post.comments}
          </Text>
        </View>
      </View>
    </View>
  );
}
