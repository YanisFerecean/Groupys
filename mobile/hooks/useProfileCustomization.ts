import { useCallback, useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/expo'
import type { ProfileCustomization } from '@/models/ProfileCustomization'
import {
  fetchUserByClerkId,
  createBackendUser,
  updateBackendUser,
  backendUserToProfile,
  type BackendUser,
} from '@/lib/api'
import { hasUsername } from '@/lib/auth'

export function useProfileCustomization() {
  const { getToken, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded } = useUser()

  const [backendUser, setBackendUser] = useState<BackendUser | null>(null)
  const [fetching, setFetching] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !user || !hasUsername(user)) return
    let cancelled = false

    ;(async () => {
      try {
        const token = await getToken()
        let bu = await fetchUserByClerkId(user.id, token)

        if (!bu) {
          await new Promise((r) => setTimeout(r, 1000))
          bu = await fetchUserByClerkId(user.id, token)
        }

        if (!bu) {
          bu = await createBackendUser(
            {
              clerkId: user.id,
              username: user.username ?? user.id,
              displayName: user.fullName ?? undefined,
            },
            token,
          )
        }

        if (!cancelled) setBackendUser(bu)
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        if (!cancelled) setFetching(false)
      }
    })()

    return () => { cancelled = true }
  }, [isLoaded, isAuthLoaded, user, getToken])

  const updateProfile = useCallback(
    async (partial: Partial<ProfileCustomization>) => {
      if (!backendUser) throw new Error('No backend user')
      setIsSaving(true)
      try {
        const token = await getToken()
        const updated = await updateBackendUser(backendUser.id, partial, token)
        setBackendUser(updated)
        return updated
      } finally {
        setIsSaving(false)
      }
    },
    [backendUser, getToken],
  )

  return {
    profile: backendUser ? backendUserToProfile(backendUser) : ({} as ProfileCustomization),
    backendUser,
    updateProfile,
    isLoaded: isLoaded && isAuthLoaded && !fetching,
    isSaving,
  }
}
