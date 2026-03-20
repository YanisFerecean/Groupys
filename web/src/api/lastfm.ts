const BASE_URL = "https://ws.audioscrobbler.com/2.0";

export interface LastFmArtist {
  name: string;
  listeners: string;
  playcount: string;
  mbid: string;
  url: string;
  image: string | null; // resolved from Deezer
}

interface LastFmArtistRaw {
  name: string;
  listeners: string;
  playcount: string;
  mbid: string;
  url: string;
}

interface LastFmChartResponse {
  artists: {
    artist: LastFmArtistRaw[];
  };
}

interface DeezerSearchResponse {
  data?: { picture_xl?: string; picture_big?: string }[];
}

/** Resolve an artist photo via Deezer's free search API (no key required). */
async function resolveImage(artistName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as DeezerSearchResponse;
    return data.data?.[0]?.picture_xl ?? data.data?.[0]?.picture_big ?? null;
  } catch {
    return null;
  }
}

export async function getTopArtists(count = 4): Promise<LastFmArtist[]> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error("Missing LASTFM_API_KEY");

  const res = await fetch(
    `${BASE_URL}/?method=chart.gettopartists&api_key=${apiKey}&format=json&limit=${count}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Last.fm API error: ${res.status}`);

  const data = (await res.json()) as LastFmChartResponse;
  const raw = data.artists.artist.slice(0, count);

  // Resolve images in parallel
  const images = await Promise.all(raw.map((a) => resolveImage(a.name)));

  return raw.map((a, i) => ({
    name: a.name,
    listeners: a.listeners,
    playcount: a.playcount,
    mbid: a.mbid,
    url: a.url,
    image: images[i],
  }));
}
