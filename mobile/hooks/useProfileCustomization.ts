import {
  backendUserToProfile,
  createBackendUser,
  fetchUserByClerkId,
  syncUserProfileImage,
  updateBackendUser,
  type BackendUser,
} from '@/lib/api'
import { hasUsername } from '@/lib/auth'
import type { ProfileCustomization } from '@/models/ProfileCustomization'
import { useAuth, useUser } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useProfileCustomization() {
  const { getToken, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded } = useUser()
  const getTokenRef = useRef(getToken)

  const [backendUser, setBackendUser] = useState<BackendUser | null>(null)
  const [fetching, setFetching] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !user || !hasUsername(user)) return
    let cancelled = false

      ; (async () => {
        try {
          const token = await getTokenRef.current()
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
                profileImage: user.imageUrl ?? undefined,
              },
              token,
            )
          } else if (user.imageUrl && bu.profileImage !== user.imageUrl) {
            bu = await syncUserProfileImage(bu, user.imageUrl, token)
          }

          if (!cancelled) setBackendUser(bu)
        } catch (err) {
          console.error('Failed to fetch profile:', err)
        } finally {
          if (!cancelled) setFetching(false)
        }
      })()

    return () => { cancelled = true }
  }, [isLoaded, isAuthLoaded, user])

  const updateProfile = useCallback(
    async (partial: Partial<ProfileCustomization>) => {
      if (!backendUser) throw new Error('No backend user')
      setIsSaving(true)
      try {
        const token = await getTokenRef.current()
        const updated = await updateBackendUser(backendUser.id, partial, token)
        setBackendUser(updated)
        return updated
      } finally {
        setIsSaving(false)
      }
    },
    [backendUser],
  )

  return {
    profile: backendUser ? backendUserToProfile(backendUser) : ({} as ProfileCustomization),
    backendUser,
    updateProfile,
    isLoaded: isLoaded && isAuthLoaded && !fetching,
    isSaving,
  }
}
