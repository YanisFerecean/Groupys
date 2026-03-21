const DEEZER_BASE = "https://api.deezer.com";

export interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string };
  album: { title: string; cover_medium: string; cover_big: string };
}

export interface DeezerArtist {
  id: number;
  name: string;
  picture_medium: string;
  picture_big: string;
  picture_xl?: string;
}

export interface DeezerAlbum {
  id: number;
  title: string;
  artist: { name: string };
  cover_medium: string;
  cover_big: string;
}

/** Resolve an artist photo via Deezer's free search API (no key required). */
export async function resolveArtistImage(
  artistName: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${DEEZER_BASE}/search/artist?q=${encodeURIComponent(artistName)}&limit=1`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: DeezerArtist[] };
    return (
      data.data?.[0]?.picture_xl ?? data.data?.[0]?.picture_big ?? null
    );
  } catch {
    return null;
  }
}

export async function searchTracks(query: string, limit = 8) {
  const res = await fetch(
    `${DEEZER_BASE}/search/track?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  const data = (await res.json()) as { data?: DeezerTrack[] };
  return (data.data ?? []).map((t) => ({
    id: String(t.id),
    title: t.title,
    artist: t.artist.name,
    album: t.album.title,
    coverUrl: t.album.cover_big || t.album.cover_medium,
  }));
}

export async function searchArtists(query: string, limit = 8) {
  const res = await fetch(
    `${DEEZER_BASE}/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  const data = (await res.json()) as { data?: DeezerArtist[] };
  return (data.data ?? []).map((a) => ({
    id: String(a.id),
    name: a.name,
    imageUrl: a.picture_big || a.picture_medium,
  }));
}

export async function searchAlbums(query: string, limit = 8) {
  const res = await fetch(
    `${DEEZER_BASE}/search/album?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  const data = (await res.json()) as { data?: DeezerAlbum[] };
  return (data.data ?? []).map((a) => ({
    id: String(a.id),
    title: a.title,
    artist: a.artist.name,
    coverUrl: a.cover_big || a.cover_medium,
  }));
}
