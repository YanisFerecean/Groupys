import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/expo'
import {
  fetchMusicTopAlbums,
  fetchMusicTopAlbumsByUserId,
  fetchMusicTopArtists,
  fetchMusicTopArtistsByUserId,
  fetchMusicTopTracks,
  fetchMusicTopTracksByUserId,
} from '@/lib/api'
import { searchTracks } from '@/lib/musicSearch'
import type { TopAlbum, TopArtist, TopSong } from '@/models/ProfileCustomization'

interface TopMusicState {
  topSongs?: TopSong[]
  topArtists?: TopArtist[]
  topAlbums?: TopAlbum[]
}

interface TopMusicOptions {
  targetUserId?: string
  musicConnected?: boolean
  syncTopSongsWithMusic?: boolean
  syncTopArtistsWithMusic?: boolean
  syncTopAlbumsWithMusic?: boolean
}

export function useTopMusic({
  targetUserId,
  musicConnected,
  syncTopSongsWithMusic,
  syncTopArtistsWithMusic,
  syncTopAlbumsWithMusic,
}: TopMusicOptions) {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [state, setState] = useState<TopMusicState>({})

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const refresh = useCallback(async () => {
    if (!musicConnected) {
      setState({})
      return
    }

    const shouldFetchSongs = syncTopSongsWithMusic === true
    const shouldFetchArtists = syncTopArtistsWithMusic === true
    const shouldFetchAlbums = syncTopAlbumsWithMusic === true

    if (!shouldFetchSongs && !shouldFetchArtists && !shouldFetchAlbums) {
      setState({})
      return
    }

    try {
      const token = await getTokenRef.current()
      if (!token) return

      const [tracksRes, artistsRes, albumsRes] = await Promise.allSettled([
        shouldFetchSongs
          ? (
              targetUserId
                ? fetchMusicTopTracksByUserId(targetUserId, token)
                : fetchMusicTopTracks(token)
            )
          : Promise.resolve([]),
        shouldFetchArtists
          ? (
              targetUserId
                ? fetchMusicTopArtistsByUserId(targetUserId, token)
                : fetchMusicTopArtists(token)
            )
          : Promise.resolve([]),
        shouldFetchAlbums
          ? (
              targetUserId
                ? fetchMusicTopAlbumsByUserId(targetUserId, token)
                : fetchMusicTopAlbums(token)
            )
          : Promise.resolve([]),
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
      console.error('Failed to fetch top music:', err)
    }
  }, [
    musicConnected,
    syncTopSongsWithMusic,
    syncTopArtistsWithMusic,
    syncTopAlbumsWithMusic,
    targetUserId,
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
    topMusic: state,
    refreshTopMusic: refresh,
  }
}
