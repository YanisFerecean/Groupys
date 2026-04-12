import { useTopMusic } from '@/hooks/useTopMusic'

interface SpotifyTopMusicOptions {
  targetUserId?: string
  spotifyConnected?: boolean
  syncTopSongsWithSpotify?: boolean
  syncTopArtistsWithSpotify?: boolean
  syncTopAlbumsWithSpotify?: boolean
}

/**
 * @deprecated use `useTopMusic` instead.
 * Temporary compatibility layer for in-progress refactors.
 */
export function useSpotifyTopMusic({
  targetUserId,
  spotifyConnected,
  syncTopSongsWithSpotify,
  syncTopArtistsWithSpotify,
  syncTopAlbumsWithSpotify,
}: SpotifyTopMusicOptions) {
  const { topMusic, refreshTopMusic } = useTopMusic({
    targetUserId,
    musicConnected: spotifyConnected,
    syncTopSongsWithMusic: syncTopSongsWithSpotify,
    syncTopArtistsWithMusic: syncTopArtistsWithSpotify,
    syncTopAlbumsWithMusic: syncTopAlbumsWithSpotify,
  })

  return {
    spotifyTopMusic: topMusic,
    refreshSpotifyTopMusic: refreshTopMusic,
  }
}
