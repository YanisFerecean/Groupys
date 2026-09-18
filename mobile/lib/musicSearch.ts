import { apiFetch, getMusicDeveloperToken } from '@/lib/api'
import { searchAppleMusic } from '@/lib/appleMusicSearch'
import type { TrackRes } from '@/models/TrackRes'
import type { ArtistRes } from '@/models/ArtistRes'
import type { AlbumRes } from '@/models/AlbumRes'
import type { TrackSearchResult } from '@/models/TrackSearchResult'
import type { ArtistSearchResult } from '@/models/ArtistSearchResult'
import type { AlbumSearchResult } from '@/models/AlbumSearchResult'

// Apple Music catalog search needs a developer token (a JWT minted by the backend). It's valid for
// hours, so cache it in-module and refetch only when it's within 60s of expiry — searching on every
// keystroke must not hammer `/music/developer-token`.
let devTokenCache: { token: string; expiresAt: number } | null = null

async function getDeveloperToken(authToken: string | null): Promise<string> {
  const now = Date.now()
  if (devTokenCache && devTokenCache.expiresAt - 60_000 > now) return devTokenCache.token
  const res = await getMusicDeveloperToken(authToken)
  devTokenCache = { token: res.token, expiresAt: res.expiresAtEpochSeconds * 1000 }
  return res.token
}

function pickArtistImage(artist: ArtistRes | null | undefined): string | undefined {
  if (!artist?.images?.length) return undefined

  return (
    artist.images.find((img) => img.includes('500x500')) ||
    artist.images.find((img) => img.includes('250x250')) ||
    artist.images[artist.images.length - 1]
  )
}

function pickAlbumCover(album: AlbumRes | null | undefined): string | undefined {
  return album?.coverMedium || album?.coverSmall
}

function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>()
  return items.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export async function searchTracks(
  query: string,
  token: string | null,
  limit = 5,
): Promise<TrackSearchResult[]> {
  // Apple Music catalog search — carries a string `catalogId` so shared tracks can be played in
  // full via native Apple Music (Listen Together). Falls back to the backend (Deezer) catalog if the
  // developer token / Apple search is unavailable, so search still works without an Apple token.
  try {
    const developerToken = await getDeveloperToken(token)
    const { tracks } = await searchAppleMusic(query, developerToken, 'us', undefined, limit)
    return uniqueById(tracks.map((track) => ({
      id: track.id,
      catalogId: track.catalogId,
      title: track.title,
      artist: track.artist?.name ?? '',
      album: track.album?.title ?? '',
      coverUrl: track.album?.coverMedium,
      preview: track.preview,
    })))
  } catch {
    return searchTracksDeezer(query, token, limit)
  }
}

async function searchTracksDeezer(
  query: string,
  token: string | null,
  limit = 5,
): Promise<TrackSearchResult[]> {
  const items = await apiFetch<TrackRes[]>(
    `/tracks/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    token,
  )

  return uniqueById(items.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist?.name ?? '',
    album: track.album?.title ?? '',
    coverUrl: track.album.coverMedium,
    preview: track.preview,
  })))
}

export async function searchArtists(
  query: string,
  token: string | null,
  limit = 5,
): Promise<ArtistSearchResult[]> {
  const items = await apiFetch<ArtistRes[]>(
    `/artists/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    token,
  )

  return uniqueById(items.map((artist) => ({
    id: artist.id,
    name: artist.name,
    imageUrl: pickArtistImage(artist),
  })))
}

export async function searchAlbums(
  query: string,
  token: string | null,
  limit = 5,
): Promise<AlbumSearchResult[]> {
  const items = await apiFetch<AlbumRes[]>(
    `/albums/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    token,
  )

  return uniqueById(items.map((album) => ({
    id: album.id,
    title: album.title,
    artist: album.artist?.name ?? '',
    coverUrl: pickAlbumCover(album),
  })))
}
