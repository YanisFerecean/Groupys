import type { ArtistRes } from '@/models/ArtistRes'
import type { AlbumRes } from '@/models/AlbumRes'
import type { TrackRes } from '@/models/TrackRes'
import type { SearchResult } from '@/models/SearchResult'

// ── Apple Music Catalog Search Types ─────────────────────────────────────────

interface AMImageArtwork {
  url: string
  width?: number
  height?: number
}

interface AMArtistAttributes {
  name: string
  artwork?: AMImageArtwork
}

interface AMAlbumAttributes {
  name: string
  artistName: string
  artwork?: AMImageArtwork
}

interface AMSongAttributes {
  name: string
  artistName: string
  albumName: string
  artwork?: AMImageArtwork
  durationInMillis?: number
  previews?: Array<{ url: string }>
}

interface AMResource<T> {
  id: string
  type: string
  attributes: T
}

interface AMSearchSection<T> {
  data: AMResource<T>[]
}

interface AMSearchResults {
  artists?: AMSearchSection<AMArtistAttributes>
  albums?: AMSearchSection<AMAlbumAttributes>
  songs?: AMSearchSection<AMSongAttributes>
}

interface AMCatalogSearchResponse {
  results: AMSearchResults
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveArtworkUrl(
  artwork: AMImageArtwork | undefined,
  w: number,
  h: number,
): string | undefined {
  if (!artwork?.url) return undefined
  return artwork.url.replace('{w}', String(w)).replace('{h}', String(h))
}

const AM_CATALOG_BASE = 'https://api.music.apple.com/v1/catalog'

// ── Main function ─────────────────────────────────────────────────────────────

export async function searchAppleMusic(
  query: string,
  developerToken: string,
  storefront: string = 'us',
  signal?: AbortSignal,
): Promise<SearchResult> {
  const url =
    `${AM_CATALOG_BASE}/${encodeURIComponent(storefront)}/search` +
    `?term=${encodeURIComponent(query)}&types=artists,albums,songs&limit=5`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${developerToken}` },
    signal,
  })

  if (!res.ok) {
    throw new Error(`Apple Music search failed: ${res.status}`)
  }

  const body = (await res.json()) as AMCatalogSearchResponse
  const r = body.results

  const artists: ArtistRes[] = (r.artists?.data ?? []).map((item) => {
    const artworkUrl = resolveArtworkUrl(item.attributes.artwork, 300, 300)
    return {
      id: parseInt(item.id, 10) || 0,
      name: item.attributes.name,
      images: artworkUrl ? [artworkUrl] : [],
      listeners: 0,
      playcount: 0,
      summary: '',
    }
  })

  const albums: AlbumRes[] = (r.albums?.data ?? []).map((item) => {
    const artistStub: ArtistRes = {
      id: 0,
      name: item.attributes.artistName,
      images: [],
      listeners: 0,
      playcount: 0,
      summary: '',
    }
    return {
      id: parseInt(item.id, 10) || 0,
      title: item.attributes.name,
      coverSmall: resolveArtworkUrl(item.attributes.artwork, 150, 150) ?? '',
      coverMedium: resolveArtworkUrl(item.attributes.artwork, 300, 300) ?? '',
      artist: artistStub,
    }
  })

  const tracks: TrackRes[] = (r.songs?.data ?? []).map((item) => {
    const a = item.attributes
    const artistStub: ArtistRes = {
      id: 0,
      name: a.artistName,
      images: [],
      listeners: 0,
      playcount: 0,
      summary: '',
    }
    const albumStub: AlbumRes = {
      id: 0,
      title: a.albumName,
      coverSmall: resolveArtworkUrl(a.artwork, 150, 150) ?? '',
      coverMedium: resolveArtworkUrl(a.artwork, 300, 300) ?? '',
      artist: artistStub,
    }
    return {
      id: parseInt(item.id, 10) || 0,
      title: a.name,
      preview: a.previews?.[0]?.url ?? '',
      duration: a.durationInMillis ? Math.round(a.durationInMillis / 1000) : 0,
      artist: artistStub,
      album: albumStub,
    }
  })

  return { artists, albums, tracks }
}
