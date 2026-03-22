import { useAuth, useUser } from '@clerk/expo'
import { useState, useCallback, useEffect, useRef } from 'react'
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
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<ProfileCustomization>({})
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null)
  const [isProfileLoaded, setIsProfileLoaded] = useState(false)
  const fetchedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded) return

    if (!user || !hasUsername(user)) {
      fetchedRef.current = null
      setBackendUser(null)
      setProfile({})
      setIsProfileLoaded(true)
      return
    }

    const fetchKey = `${user.id}:${user.username}`
    if (fetchedRef.current === fetchKey) return
    fetchedRef.current = fetchKey
    setIsProfileLoaded(false)

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

        setBackendUser(bu)
        setProfile(backendUserToProfile(bu))
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setIsProfileLoaded(true)
      }
    })()
  }, [getToken, isAuthLoaded, isLoaded, user])

  const updateProfile = useCallback(
    async (partial: Partial<ProfileCustomization>) => {
      if (!backendUser) return
      setIsSaving(true)
      try {
        const token = await getToken()
        const updated = await updateBackendUser(backendUser.id, partial, token)
        setBackendUser(updated)
        setProfile(backendUserToProfile(updated))
      } finally {
        setIsSaving(false)
      }
    },
    [backendUser, getToken],
  )

  return {
    profile,
    backendUser,
    updateProfile,
    isLoaded: isLoaded && isProfileLoaded,
    isSaving,
  }
}
