import { Ionicons } from '@expo/vector-icons'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FeaturedPost from '@/components/feed/FeaturedPost'
import ArtistSpotlight from '@/components/feed/ArtistSpotlight'
import PostGrid from '@/components/feed/PostGrid'
import PostListItem from '@/components/feed/PostListItem'
import FAB from '@/components/ui/FAB'
import { Colors } from '@/constants/colors'
import {
  featuredPost,
  artistSpotlight,
  gridPosts,
  listPosts,
} from '@/constants/mockData'

export default function FeedScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="text-4xl font-extrabold tracking-tighter text-primary">
            Feed
          </Text>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Featured Post */}
        <View className="px-5 pt-5">
          <FeaturedPost post={featuredPost} />
        </View>

        {/* Artist Spotlight */}
        <View className="pt-6">
          <ArtistSpotlight artist={artistSpotlight} />
        </View>

        {/* Post Grid */}
        <View className="px-5 pt-6">
          <PostGrid posts={gridPosts} />
        </View>

        {/* List Posts */}
        <View className="px-5 pt-4">
          {listPosts.map((post) => (
            <PostListItem key={post.id} post={post} />
          ))}
        </View>
      </ScrollView>

      <FAB icon="add" onPress={() => {}} />
    </View>
  )
}
