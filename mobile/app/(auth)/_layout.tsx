import { useAuth, useUser } from '@clerk/expo'
import { Redirect, Stack } from 'expo-router'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { isAccountSetupComplete } from '@/lib/auth'

export default function AuthLayout() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return <FullscreenSpinner />
  }

  if (isSignedIn) {
    return <Redirect href={isAccountSetupComplete(user) ? '/(home)/(feed)' : '/complete-profile'} />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
