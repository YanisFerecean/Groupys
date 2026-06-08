import { useAuth, useUser } from '@clerk/expo'
import { Redirect, Stack } from 'expo-router'
import LoadingGate from '@/components/ui/LoadingGate'
import { isAccountSetupComplete } from '@/lib/auth'

export default function AuthLayout() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return (
      <LoadingGate
        isAuthLoaded={isAuthLoaded}
        isSignedIn={isSignedIn}
        isUserLoaded={isUserLoaded}
        label="auth-layout"
      />
    )
  }

  if (isSignedIn) {
    return <Redirect href={isAccountSetupComplete(user) ? '/(home)/(feed)' : '/complete-profile'} />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
