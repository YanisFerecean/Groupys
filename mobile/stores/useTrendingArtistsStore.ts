import { create } from 'zustand'
import { apiFetch } from '@/lib/api'
import type { ArtistRes as ChartArtist } from '@/models/ArtistRes'

interface TrendingArtistsState {
  artists: ChartArtist[]
  loading: boolean
  lastFetched: number | null
  fetchArtists: (token: string | null) => Promise<void>
}

const STALE_TIME = 1000 * 60 * 60 // 1 hour

export const useTrendingArtistsStore = create<TrendingArtistsState>((set, get) => ({
  artists: [],
  loading: false,
  lastFetched: null,
  fetchArtists: async (token: string | null) => {
    const { artists, lastFetched, loading } = get()
    const now = Date.now()

    // If we have artists and they were fetched within the last hour, don't fetch again
    if (artists.length > 0 && lastFetched && now - lastFetched < STALE_TIME) {
      return
    }

    // Don't start multiple fetches
    if (loading) return

    set({ loading: true })
    try {
      // Use cache=true (default) to leverage native caching as well
      const data = await apiFetch<ChartArtist[]>('/charts/artists/global', token)
      set({
        artists: data.slice(0, 6),
        lastFetched: now,
        loading: false,
      })
    } catch (err) {
      console.error('Failed to fetch trending artists:', err)
      set({ loading: false })
    }
  },
}))
