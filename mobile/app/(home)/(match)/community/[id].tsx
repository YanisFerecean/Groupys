import CommunityDetailScreen from '@/components/community/CommunityDetailScreen'
import { useLocalSearchParams } from 'expo-router'

export default function MatchCommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <CommunityDetailScreen
      communityId={id!}
      postRoute="/(home)/(match)/post"
      communityRoute="/(home)/(match)/community"
    />
  )
}
