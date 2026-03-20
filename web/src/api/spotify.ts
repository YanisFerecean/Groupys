// Global Top 50 playlist ID (official Spotify playlist)
const GLOBAL_TOP_50_ID = "37i9dQZEVXbMDoHDwVN2tF";

interface SpotifyAccessTokenResponse {
  access_token: string;
}

interface SpotifyArtist {
  id: string;
  name: string;
  popularity: number;
  followers: { total: number };
  images: { url: string; width: number; height: number }[];
  genres: string[];
  external_urls: { spotify: string };
}

interface SpotifyPlaylistTrack {
  track: {
    artists: { id: string; name: string }[];
  } | null;
}

async function getAccessToken(): Promise<string> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    next: { revalidate: 3600 },
  });
  const data = (await res.json()) as SpotifyAccessTokenResponse;
  return data.access_token;
}

export async function getTopArtists(count = 4): Promise<SpotifyArtist[]> {
  const token = await getAccessToken();

  const playlistRes = await fetch(
    `https://api.spotify.com/v1/playlists/${GLOBAL_TOP_50_ID}/tracks?limit=50`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    }
  );
  const playlist = (await playlistRes.json()) as { items: SpotifyPlaylistTrack[] };

  // Collect unique artist IDs in chart order
  const seen = new Set<string>();
  const artistIds: string[] = [];
  for (const item of playlist.items) {
    if (!item.track?.artists) continue;
    for (const artist of item.track.artists) {
      if (!seen.has(artist.id)) {
        seen.add(artist.id);
        artistIds.push(artist.id);
      }
    }
    if (artistIds.length >= 20) break;
  }

  const ids = artistIds.slice(0, 20).join(",");
  const artistsRes = await fetch(`https://api.spotify.com/v1/artists?ids=${ids}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  const artistsData = (await artistsRes.json()) as { artists: SpotifyArtist[] };

  return artistsData.artists.sort((a, b) => b.popularity - a.popularity).slice(0, count);
}
