import { useLocalSearchParams } from 'expo-router'
import PostDetailScreen from '@/components/post/PostDetailScreen'

export default function FeedPostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <PostDetailScreen postId={id!} />
}
