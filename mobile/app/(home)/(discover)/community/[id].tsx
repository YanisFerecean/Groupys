import { useLocalSearchParams } from 'expo-router'
import CommunityDetailScreen from '@/components/community/CommunityDetailScreen'

export default function DiscoverCommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <CommunityDetailScreen
      communityId={id!}
      postRoute="/(home)/(discover)/post"
      communityRoute="/(home)/(discover)/community"
    />
  )
}
