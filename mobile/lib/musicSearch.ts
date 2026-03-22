import { apiFetch } from '@/lib/api'
import type { TrackRes } from '@/models/TrackRes'
import type { ArtistRes } from '@/models/ArtistRes'
import type { AlbumRes } from '@/models/AlbumRes'
import type { TrackSearchResult } from '@/models/TrackSearchResult'
import type { ArtistSearchResult } from '@/models/ArtistSearchResult'
import type { AlbumSearchResult } from '@/models/AlbumSearchResult'

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

export async function searchTracks(
  query: string,
  token: string | null,
  limit = 5,
): Promise<TrackSearchResult[]> {
  const items = await apiFetch<TrackRes[]>(
    `/tracks/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    token,
  )


  return items.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist?.name ?? '',
    album: track.album?.title ?? '',
    coverUrl: track.album.coverMedium,
    preview: track.preview,
  }))
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

  return items.map((artist) => ({
    id: artist.id,
    name: artist.name,
    imageUrl: pickArtistImage(artist),
  }))
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

  return items.map((album) => ({
    id: album.id,
    title: album.title,
    artist: album.artist?.name ?? '',
    coverUrl: pickAlbumCover(album),
  }))
}
