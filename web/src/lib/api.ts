import type { ProfileCustomization } from "@/types/profile";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

// ── Backend types ──────────────────────────────────────────────────────────

interface BackendWidget {
  type: string;
  color: string | null;
  pos: number;
  data: Record<string, unknown>;
}

export interface BackendUser {
  id: string;
  clerkId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  country: string | null;
  bannerUrl: string | null;
  accentColor: string | null;
  nameColor: string | null;
  profileImage: string | null;
  widgets: string | null;
  tags: string[];
  dateJoined: string;
  spotifyConnected: boolean;
}

// ── Widget ↔ ProfileCustomization conversion ───────────────────────────────

function widgetsToProfile(widgets: BackendWidget[]): Partial<ProfileCustomization> {
  const sorted = [...widgets].sort((a, b) => a.pos - b.pos);
  const result: Partial<ProfileCustomization> = {};

  result.widgetOrder = sorted.map((w) => w.type);

  for (const w of sorted) {
    const items = (w.data?.items ?? []) as Record<string, string>[];

    switch (w.type) {
      case "topSongs":
        result.topSongs = items.map((i) => ({
          title: i.title,
          artist: i.artist,
          coverUrl: i.coverUrl,
        }));
        result.songsContainerColor = w.color ?? undefined;
        break;
      case "topArtists":
        result.topArtists = items.map((i) => ({
          name: i.name,
          genre: i.genre,
          imageUrl: i.imageUrl,
        }));
        result.artistsContainerColor = w.color ?? undefined;
        break;
      case "topAlbums":
        result.topAlbums = items.map((i) => ({
          title: i.title,
          artist: i.artist,
          coverUrl: i.coverUrl,
        }));
        result.albumsContainerColor = w.color ?? undefined;
        break;
      case "lastRatedAlbum":
        result.showLastRatedAlbum = true;
        break;
      case "currentlyListening": {
        const d = w.data as Record<string, string>;
        if (d.title) {
          result.currentlyListening = {
            title: d.title,
            artist: d.artist,
            coverUrl: d.coverUrl,
          };
        }
        break;
      }
    }
  }

  return result;
}

function profileToWidgets(profile: Partial<ProfileCustomization>): BackendWidget[] {
  type W = Omit<BackendWidget, "pos">;
  const widgetData: Partial<Record<string, W>> = {};

  if (profile.topAlbums?.length) {
    widgetData.topAlbums = { type: "topAlbums", color: profile.albumsContainerColor ?? null, data: { items: profile.topAlbums } };
  }
  if (profile.currentlyListening?.title) {
    widgetData.currentlyListening = { type: "currentlyListening", color: null, data: { ...profile.currentlyListening } };
  }
  if (profile.topSongs?.length) {
    widgetData.topSongs = { type: "topSongs", color: profile.songsContainerColor ?? null, data: { items: profile.topSongs } };
  }
  if (profile.showLastRatedAlbum) {
    widgetData.lastRatedAlbum = { type: "lastRatedAlbum", color: null, data: {} };
  }
  if (profile.topArtists?.length) {
    widgetData.topArtists = { type: "topArtists", color: profile.artistsContainerColor ?? null, data: { items: profile.topArtists } };
  }

  const defaultOrder = ["topAlbums", "currentlyListening", "topSongs", "lastRatedAlbum", "topArtists"];
  const order = profile.widgetOrder ?? defaultOrder;

  const widgets: BackendWidget[] = [];
  let pos = 0;

  // Emit widgets in the saved order first
  for (const type of order) {
    const w = widgetData[type];
    if (w) {
      widgets.push({ ...w, pos: pos++ });
      delete widgetData[type];
    }
  }

  // Then any remaining widgets not covered by the order
  for (const w of Object.values(widgetData)) {
    if (w) widgets.push({ ...w, pos: pos++ });
  }

  return widgets;
}

// ── JSON parsing helper ───────────────────────────────────────────────────

function parseWidgets(raw: string | null): BackendWidget[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BackendWidget[];
  } catch {
    return [];
  }
}

// ── Conversion helpers ─────────────────────────────────────────────────────

export function backendUserToProfile(user: BackendUser): ProfileCustomization {
  return {
    displayName: user.displayName ?? undefined,
    bio: user.bio ?? undefined,
    country: user.country ?? undefined,
    bannerUrl: user.bannerUrl ?? undefined,
    accentColor: user.accentColor ?? undefined,
    nameColor: user.nameColor ?? undefined,
    tags: user.tags ?? [],
    ...widgetsToProfile(parseWidgets(user.widgets)),
  };
}

// ── API calls ──────────────────────────────────────────────────────────────

type JsonRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function requireToken(token: string | null): string {
  if (!token) {
    throw new Error("Missing Clerk session token for authenticated API request");
  }

  return token;
}

async function apiRequest(
  path: string,
  token: string | null,
  init: JsonRequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${requireToken(token)}`);

  const { body, ...rest } = init;
  const requestInit: RequestInit = {
    ...rest,
    headers,
  };

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(body);
  }

  return fetch(`${API_URL}${path}`, requestInit);
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.text().catch(() => "");
  return body ? `${fallback} (${res.status}): ${body}` : `${fallback} (${res.status})`;
}

export async function fetchUserByClerkId(
  clerkId: string,
  token: string | null,
): Promise<BackendUser | null> {
  const res = await apiRequest(`/users/clerk/${encodeURIComponent(clerkId)}`, token);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to fetch user profile"));
  return res.json();
}

export async function createBackendUser(
  data: {
    clerkId: string;
    username: string;
    displayName?: string;
    bio?: string;
    profileImage?: string;
  },
  token: string | null,
): Promise<BackendUser> {
  const res = await apiRequest("/users", token, {
    method: "POST",
    body: data,
  });

  if (res.status === 409) {
    // User already exists (race condition) — fetch and return
    const existing = await fetchUserByClerkId(data.clerkId, token);
    if (existing) return existing;
  }

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to create user"));
  }
  return res.json();
}

// ── Album Ratings ──────────────────────────────────────────────────────────

export interface AlbumRatingRes {
  id: string;
  albumId: number;
  albumTitle: string;
  albumCoverUrl: string | null;
  artistName: string | null;
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  score: number;
  review: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumRatingCreate {
  albumId: number;
  albumTitle: string;
  albumCoverUrl: string | null;
  artistName: string | null;
  score: number;
  review: string | null;
}

export async function upsertAlbumRating(
  data: AlbumRatingCreate,
  token: string | null,
): Promise<AlbumRatingRes> {
  const res = await apiRequest("/album-ratings", token, {
    method: "POST",
    body: data,
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to save rating"));
  return res.json();
}

export async function fetchAlbumRatings(
  albumId: number,
  token: string | null,
): Promise<AlbumRatingRes[]> {
  const res = await apiRequest(`/album-ratings/album/${albumId}`, token);
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to fetch ratings"));
  return res.json();
}

export async function fetchMyAlbumRatings(
  token: string | null,
): Promise<AlbumRatingRes[]> {
  const res = await apiRequest("/album-ratings/mine", token);
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to fetch your ratings"));
  return res.json();
}

export async function fetchUserAlbumRatings(
  username: string,
  token: string | null,
): Promise<AlbumRatingRes[]> {
  const res = await apiRequest(`/album-ratings/user/${encodeURIComponent(username)}`, token);
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to fetch ratings"));
  return res.json();
}

export async function deleteAlbumRating(
  ratingId: string,
  token: string | null,
): Promise<void> {
  const res = await apiRequest(`/album-ratings/${encodeURIComponent(ratingId)}`, token, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to delete rating"));
}

export async function updateBackendUser(
  userId: string,
  data: Partial<ProfileCustomization>,
  token: string | null,
): Promise<BackendUser> {
  const widgets = profileToWidgets(data);
  const body = {
    displayName: data.displayName ?? null,
    bio: data.bio ?? null,
    country: data.country ?? null,
    bannerUrl: data.bannerUrl ?? null,
    accentColor: data.accentColor ?? null,
    nameColor: data.nameColor ?? null,
    profileImage: data.profileImage ?? null,
    widgets: widgets.length ? JSON.stringify(widgets) : null,
    tags: data.tags ?? null,
  };

  const res = await apiRequest(`/users/${encodeURIComponent(userId)}`, token, {
    method: "PUT",
    body,
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to update user profile"));
  return res.json();
}
