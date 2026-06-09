import { useCallback } from 'react'
import { Platform } from 'react-native'
import { useAuth } from '@clerk/expo'
import { useQuery } from '@tanstack/react-query'

import { getMusicCapability } from '@/lib/api'

/**
 * Source of music actions a user can take (chat × music plan, ticket 0.2).
 * - `apple`: connected Apple Music account (live + catalog).
 * - `manual`: not connected — catalog search/creation still works via the developer token.
 * - `none`: no music affordances available at all.
 */
export type MusicSource = 'apple' | 'manual' | 'none'

export interface MusicCapability {
  /** Apple Music user token is stored on the backend. */
  connected: boolean
  /** Connected token resolves an active subscription. */
  hasSubscription: boolean
  /** Full playback / add-to-library allowed (needs subscription + connection). */
  canPlayFull: boolean
  /** Live now-playing presence can be shared (needs a connected account; no manual fallback). */
  canShareNowPlaying: boolean
  source: MusicSource
  isLoading: boolean
  refetch: () => void
}

export const MUSIC_CAPABILITY_QUERY_KEY = ['music', 'capability'] as const

export function useMusicCapability(): MusicCapability {
  const { getToken } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: MUSIC_CAPABILITY_QUERY_KEY,
    queryFn: async () => {
      const token = await getToken()
      return getMusicCapability(token)
    },
    staleTime: 60_000,
    // Capability errors (offline, token expired) degrade to preview-only rather than crash.
    retry: 1,
  })

  const refetchCb = useCallback(() => {
    void refetch()
  }, [refetch])

  const connected = data?.connected ?? false
  const hasSubscription = data?.subscriptionActive ?? false
  const canPlayFull = connected && hasSubscription
  const canShareNowPlaying = connected

  // Content-creation features fall back to manual catalog search (developer token) when not
  // connected — available on every platform. `none` is reserved for unexpected states.
  const source: MusicSource = connected ? 'apple' : (Platform.OS === 'ios' || Platform.OS === 'android' ? 'manual' : 'none')

  return {
    connected,
    hasSubscription,
    canPlayFull,
    canShareNowPlaying,
    source,
    isLoading,
    refetch: refetchCb,
  }
}
