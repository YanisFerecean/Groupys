import { useAuth, useUser } from '@clerk/expo'
import { Redirect } from 'expo-router'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { isAccountSetupComplete } from '@/lib/auth'

export default function Index() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return <FullscreenSpinner />
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/landing" />
  }

  return isAccountSetupComplete(user) ? <Redirect href="/(home)/(feed)" /> : <Redirect href="/complete-profile" />
}
