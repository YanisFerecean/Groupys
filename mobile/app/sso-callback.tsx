import { useAuth, useUser } from '@clerk/expo'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import FullscreenSpinner from '@/components/ui/FullscreenSpinner'
import { isAccountSetupComplete } from '@/lib/auth'

const CALLBACK_GRACE_PERIOD_MS = 1500

export default function SSOCallbackScreen() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()
  const [gracePeriodComplete, setGracePeriodComplete] = useState(false)

  useEffect(() => {
    if (isSignedIn) {
      setGracePeriodComplete(true)
      return
    }

    const timeout = setTimeout(() => {
      setGracePeriodComplete(true)
    }, CALLBACK_GRACE_PERIOD_MS)

    return () => clearTimeout(timeout)
  }, [isSignedIn])

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return <FullscreenSpinner />
  }

  if (!isSignedIn) {
    return gracePeriodComplete ? <Redirect href="/(auth)/sign-in" /> : <FullscreenSpinner />
  }

  return <Redirect href={isAccountSetupComplete(user) ? '/(home)/(feed)' : '/complete-profile'} />
}
