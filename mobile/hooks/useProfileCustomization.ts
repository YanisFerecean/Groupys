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

  const fetchAndEnsureBackendUser = useCallback(async () => {
    if (!user || !hasUsername(user)) {
      throw new Error('No signed-in user available')
    }

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

    return bu
  }, [user])

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded) return

    if (!user || !hasUsername(user)) {
      setBackendUser(null)
      setFetching(false)
      return
    }

    let cancelled = false
    setFetching(true)

    ;(async () => {
      try {
        const bu = await fetchAndEnsureBackendUser()
        if (!cancelled) setBackendUser(bu)
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        if (!cancelled) setFetching(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fetchAndEnsureBackendUser, isLoaded, isAuthLoaded, user])

  const refreshProfile = useCallback(async () => {
    if (!isLoaded || !isAuthLoaded || !user || !hasUsername(user)) return null

    try {
      const refreshed = await fetchAndEnsureBackendUser()
      setBackendUser(refreshed)
      return refreshed
    } catch (err) {
      console.error('Failed to refresh profile:', err)
      return null
    }
  }, [fetchAndEnsureBackendUser, isAuthLoaded, isLoaded, user])

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
    refreshProfile,
    isLoaded: isLoaded && isAuthLoaded && !fetching,
    isSaving,
  }
}
