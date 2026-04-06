import { useEffect } from 'react'
import { Redirect } from 'expo-router'
import { useTabBar } from '@/contexts/TabBarContext'

export default function BackScreen() {
  const { previousTab, setSearchMode } = useTabBar()

  useEffect(() => {
    // Exit search mode
    setSearchMode(false)
  }, [setSearchMode])

  // Redirect to the previous tab
  const getRedirectPath = () => {
    switch (previousTab) {
      case '(feed)':
        return '/(home)/(feed)'
      case '(match)':
        return '/(home)/(match)'
      case '(profile)':
        return '/(home)/(profile)'
      case '(discover)':
        return '/(home)/(feed)'
      case 'create-post':
        return '/(home)/create-post'
      default:
        return '/(home)/(feed)'
    }
  }

  return <Redirect href={getRedirectPath() as any} />
}
