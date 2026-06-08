import { useAuth, useUser } from '@clerk/expo'
import { Redirect } from 'expo-router'
import LoadingGate from '@/components/ui/LoadingGate'
import { isAccountSetupComplete } from '@/lib/auth'

export default function Index() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return (
      <LoadingGate
        isAuthLoaded={isAuthLoaded}
        isSignedIn={isSignedIn}
        isUserLoaded={isUserLoaded}
        label="index"
      />
    )
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/landing" />
  }

  return isAccountSetupComplete(user) ? <Redirect href="/(home)/(feed)" /> : <Redirect href="/complete-profile" />
}
