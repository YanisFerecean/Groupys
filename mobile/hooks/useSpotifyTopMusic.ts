import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/expo'
import {
  fetchSpotifyTopAlbums,
  fetchSpotifyTopArtists,
  fetchSpotifyTopTracks,
} from '@/lib/api'
import { searchTracks } from '@/lib/musicSearch'
import type { TopAlbum, TopArtist, TopSong } from '@/models/ProfileCustomization'

interface SpotifyTopMusicState {
  topSongs?: TopSong[]
  topArtists?: TopArtist[]
  topAlbums?: TopAlbum[]
}

interface SpotifyTopMusicOptions {
  spotifyConnected?: boolean
  syncTopSongsWithSpotify?: boolean
  syncTopArtistsWithSpotify?: boolean
  syncTopAlbumsWithSpotify?: boolean
}

export function useSpotifyTopMusic({
  spotifyConnected,
  syncTopSongsWithSpotify,
  syncTopArtistsWithSpotify,
  syncTopAlbumsWithSpotify,
}: SpotifyTopMusicOptions) {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [state, setState] = useState<SpotifyTopMusicState>({})

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const refresh = useCallback(async () => {
    if (!spotifyConnected) {
      setState({})
      return
    }

    const shouldFetchSongs = syncTopSongsWithSpotify === true
    const shouldFetchArtists = syncTopArtistsWithSpotify === true
    const shouldFetchAlbums = syncTopAlbumsWithSpotify === true

    if (!shouldFetchSongs && !shouldFetchArtists && !shouldFetchAlbums) {
      setState({})
      return
    }

    try {
      const token = await getTokenRef.current()
      if (!token) return

      const [tracksRes, artistsRes, albumsRes] = await Promise.allSettled([
        shouldFetchSongs ? fetchSpotifyTopTracks(token) : Promise.resolve([]),
        shouldFetchArtists ? fetchSpotifyTopArtists(token) : Promise.resolve([]),
        shouldFetchAlbums ? fetchSpotifyTopAlbums(token) : Promise.resolve([]),
      ])

      const topSongs: TopSong[] | undefined =
        tracksRes.status === 'fulfilled'
          ? await Promise.all(
              tracksRes.value
                .filter((track) => !!track.title)
                .map(async (track, index) => {
                  let previewUrl: string | undefined
                  try {
                    const query = `${track.title} ${track.artist ?? ''}`.trim()
                    const results = await searchTracks(query, token, 5)
                    const exact = results.find(
                      (item) =>
                        item.title.toLowerCase() === track.title.toLowerCase() &&
                        (item.artist ?? '').toLowerCase() === (track.artist ?? '').toLowerCase(),
                    )
                    previewUrl = exact?.preview ?? results[0]?.preview
                  } catch {
                    previewUrl = undefined
                  }

                  return {
                    id: index + 1,
                    title: track.title,
                    artist: track.artist ?? '',
                    coverUrl: track.coverUrl ?? undefined,
                    previewUrl,
                  }
                }),
            )
          : undefined

      setState({
        topSongs,
        topArtists:
          artistsRes.status === 'fulfilled'
            ? artistsRes.value
                .filter((artist) => !!artist.name)
                .map((artist) => ({
                  name: artist.name,
                  imageUrl: artist.imageUrl ?? undefined,
                }))
            : undefined,
        topAlbums:
          albumsRes.status === 'fulfilled'
            ? albumsRes.value
                .filter((album) => !!album.title)
                .map((album, index) => ({
                  id: index + 1,
                  title: album.title,
                  artist: album.artist ?? '',
                  coverUrl: album.coverUrl ?? undefined,
                }))
            : undefined,
      })
    } catch (err) {
      console.error('Failed to fetch Spotify top music:', err)
    }
  }, [
    spotifyConnected,
    syncTopSongsWithSpotify,
    syncTopArtistsWithSpotify,
    syncTopAlbumsWithSpotify,
  ])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (cancelled) return
      await refresh()
    })()

    return () => {
      cancelled = true
    }
  }, [refresh])

  return {
    spotifyTopMusic: state,
    refreshSpotifyTopMusic: refresh,
  }
}
