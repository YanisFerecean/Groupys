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
  const result: Partial<ProfileCustomization> = {};

  for (const w of widgets) {
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
  const widgets: BackendWidget[] = [];
  let pos = 0;

  if (profile.topAlbums?.length) {
    widgets.push({
      type: "topAlbums",
      color: profile.albumsContainerColor ?? null,
      pos: pos++,
      data: { items: profile.topAlbums },
    });
  }

  if (profile.currentlyListening?.title) {
    widgets.push({
      type: "currentlyListening",
      color: null,
      pos: pos++,
      data: { ...profile.currentlyListening },
    });
  }

  if (profile.topSongs?.length) {
    widgets.push({
      type: "topSongs",
      color: profile.songsContainerColor ?? null,
      pos: pos++,
      data: { items: profile.topSongs },
    });
  }

  if (profile.topArtists?.length) {
    widgets.push({
      type: "topArtists",
      color: profile.artistsContainerColor ?? null,
      pos: pos++,
      data: { items: profile.topArtists },
    });
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
