import { useLocalSearchParams } from 'expo-router'
import CommunityDetailScreen from '@/components/community/CommunityDetailScreen'

export default function FeedCommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <CommunityDetailScreen
      communityId={id!}
      postRoute="/(home)/(feed)/post"
      communityRoute="/(home)/(feed)/community"
    />
  )
}
