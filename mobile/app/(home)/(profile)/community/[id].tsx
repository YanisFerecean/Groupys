import CommunityDetailScreen from '@/components/community/CommunityDetailScreen'
import { useLocalSearchParams } from 'expo-router'

export default function ProfileCommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <CommunityDetailScreen
      communityId={id!}
      postRoute="/(home)/(profile)/post"
      communityRoute="/(home)/(profile)/community"
    />
  )
}
