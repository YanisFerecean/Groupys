const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export interface SpotifyArtist {
  name: string;
  imageUrl?: string;
}

export interface SpotifyTrack {
  title: string;
  artist: string;
  coverUrl?: string;
}

export interface SpotifyAlbum {
  title: string;
  artist: string;
  coverUrl?: string;
}

async function authFetch(path: string, token: string): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchSpotifyTopArtists(token: string): Promise<SpotifyArtist[]> {
  const res = await authFetch("/spotify/top-artists", token);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSpotifyTopTracks(token: string): Promise<SpotifyTrack[]> {
  const res = await authFetch("/spotify/top-tracks", token);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSpotifySavedAlbums(token: string): Promise<SpotifyAlbum[]> {
  const res = await authFetch("/spotify/saved-albums", token);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSpotifyCurrentlyPlaying(token: string): Promise<SpotifyTrack | null> {
  const res = await authFetch("/spotify/currently-playing", token);
  if (!res.ok || res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

export async function fetchSpotifyAuthUrl(token: string): Promise<string> {
  const res = await authFetch("/spotify/auth-url", token);
  if (!res.ok) throw new Error("Failed to get auth URL");
  const data = await res.json();
  return data.url;
}

export async function disconnectSpotify(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/spotify/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to disconnect");
}
