import PublicProfileScreen from '@/components/profile/PublicProfileScreen'
import { useLocalSearchParams } from 'expo-router'

export default function PublicProfileRoute() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>()
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId

  if (!userId) {
    return null
  }

  return <PublicProfileScreen userId={userId} />
}
