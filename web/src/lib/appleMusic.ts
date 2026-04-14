const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
const MUSIC_KIT_SCRIPT_URL = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
const APPLE_MUSIC_APP_NAME = process.env.NEXT_PUBLIC_APPLE_MUSIC_APP_NAME ?? "Groupys Web";
const APPLE_MUSIC_APP_BUILD = process.env.NEXT_PUBLIC_APPLE_MUSIC_APP_BUILD ?? "1.0.0";
const APPLE_MUSIC_WEB_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_APPLE_MUSIC_SIMULATOR_MOCK === "true";
const MUSIC_ENDPOINTS = {
  developerToken: "/music/developer-token",
  connect: "/music/connect",
  disconnect: "/music/disconnect",
  topArtists: "/music/top-artists",
  topTracks: "/music/top-tracks",
  topAlbums: "/music/top-albums",
  currentlyPlaying: "/music/currently-playing",
  syncDiscovery: "/discovery/music/sync",
} as const;

type ErrorBody = {
  message?: string;
  error?: string;
};

export interface MusicArtist {
  name: string;
  imageUrl?: string;
}

export interface MusicTrack {
  title: string;
  artist: string;
  coverUrl?: string;
}

export interface MusicAlbum {
  title: string;
  artist: string;
  coverUrl?: string;
}

interface MusicDeveloperTokenResponse {
  token: string;
  expiresAtEpochSeconds: number;
}

interface MusicKitInstance {
  authorize(): Promise<string>;
  musicUserToken?: string;
}

interface MusicKitGlobal {
  configure(config: {
    developerToken: string;
    app: {
      name: string;
      build: string;
    };
  }): Promise<MusicKitInstance>;
  getInstance(): MusicKitInstance | undefined;
}

declare global {
  interface Window {
    MusicKit?: MusicKitGlobal;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  return body.message ?? body.error ?? `${fallback} (HTTP ${res.status})`;
}

async function authFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });
}

async function parseJsonOrFallback<T>(res: Response, fallback: T): Promise<T> {
  const text = await res.text();
  if (!text) return fallback;
  return JSON.parse(text) as T;
}

async function loadMusicKitScript(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Apple Music web authorization is only available in the browser.");
  }

  if (window.MusicKit) return;
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-music-kit="true"]');
    const onLoaded = () => {
      if (!window.MusicKit) {
        reject(new Error("MusicKit failed to initialize."));
        return;
      }
      resolve();
    };
    const onError = () => reject(new Error("Failed to load MusicKit Web SDK."));

    const handleScriptLoad = () => {
      // Prefer immediate resolution when the SDK is already ready.
      if (window.MusicKit) {
        onLoaded();
      }
    };

    document.addEventListener("musickitloaded", onLoaded, { once: true });

    if (existing) {
      existing.addEventListener("load", handleScriptLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      handleScriptLoad();
      return;
    }

    const script = document.createElement("script");
    script.src = MUSIC_KIT_SCRIPT_URL;
    script.async = true;
    script.dataset.musicKit = "true";
    script.addEventListener("load", handleScriptLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  }).finally(() => {
    if (!window.MusicKit) {
      scriptLoadPromise = null;
    }
  });

  return scriptLoadPromise;
}

async function fetchMusicDeveloperToken(token: string): Promise<MusicDeveloperTokenResponse> {
  const res = await authFetch(MUSIC_ENDPOINTS.developerToken, token);
  if (!res.ok) {
    throw new Error(await readError(res, "Failed to get Apple Music developer token"));
  }
  return res.json();
}

async function connectMusicUserToken(token: string, musicUserToken: string): Promise<void> {
  const res = await authFetch(MUSIC_ENDPOINTS.connect, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicUserToken }),
  });
  if (!res.ok) {
    throw new Error(await readError(res, "Failed to connect Apple Music"));
  }
}

export function isAppleMusicWebMockEnabled(): boolean {
  return APPLE_MUSIC_WEB_MOCK_ENABLED;
}

export async function connectAppleMusicWeb(token: string): Promise<void> {
  if (APPLE_MUSIC_WEB_MOCK_ENABLED) {
    await connectMusicUserToken(token, "simulator_mock_web_user_token");
    return;
  }

  const developerToken = await fetchMusicDeveloperToken(token);
  await loadMusicKitScript();

  if (!window.MusicKit) {
    throw new Error("MusicKit is unavailable in this browser session.");
  }

  const instance = await window.MusicKit.configure({
    developerToken: developerToken.token,
    app: {
      name: APPLE_MUSIC_APP_NAME,
      build: APPLE_MUSIC_APP_BUILD,
    },
  });
  const musicUserToken = instance.musicUserToken ?? (await instance.authorize());

  if (!musicUserToken) {
    throw new Error("Apple Music user authorization was not granted.");
  }

  await connectMusicUserToken(token, musicUserToken);
}

export async function fetchMusicTopArtists(token: string): Promise<MusicArtist[]> {
  const res = await authFetch(MUSIC_ENDPOINTS.topArtists, token);
  if (!res.ok) {
    throw new Error(await readError(res, "Failed to fetch top artists"));
  }
  return parseJsonOrFallback<MusicArtist[]>(res, []);
}

export async function fetchMusicTopTracks(token: string): Promise<MusicTrack[]> {
  const res = await authFetch(MUSIC_ENDPOINTS.topTracks, token);
  if (!res.ok) {
    throw new Error(await readError(res, "Failed to fetch top tracks"));
  }
  return parseJsonOrFallback<MusicTrack[]>(res, []);
}

export async function fetchMusicTopAlbums(token: string): Promise<MusicAlbum[]> {
  const res = await authFetch(MUSIC_ENDPOINTS.topAlbums, token);
  if (!res.ok) {
    throw new Error(await readError(res, "Failed to fetch top albums"));
  }
  return parseJsonOrFallback<MusicAlbum[]>(res, []);
}

export async function syncMusicDiscovery(token: string): Promise<void> {
  const res = await authFetch(MUSIC_ENDPOINTS.syncDiscovery, token, { method: "POST" });
  if (!res.ok) {
    throw new Error(await readError(res, "Failed to sync Apple Music"));
  }
}

export async function fetchMusicCurrentlyPlaying(token: string): Promise<MusicTrack | null> {
  const res = await authFetch(MUSIC_ENDPOINTS.currentlyPlaying, token);
  if (!res.ok || res.status === 204) return null;
  return parseJsonOrFallback<MusicTrack | null>(res, null);
}

export async function disconnectMusic(token: string): Promise<void> {
  const res = await fetch(`${API_URL}${MUSIC_ENDPOINTS.disconnect}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await readError(res, "Failed to disconnect Apple Music"));
  }
}
