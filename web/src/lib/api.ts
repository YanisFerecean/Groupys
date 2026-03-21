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
  dateJoined: string;
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
    ...widgetsToProfile(parseWidgets(user.widgets)),
  };
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function fetchUserByClerkId(
  clerkId: string,
): Promise<BackendUser | null> {
  const res = await fetch(`${API_URL}/users/clerk/${clerkId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

export async function createBackendUser(data: {
  clerkId: string;
  username: string;
  displayName?: string;
  bio?: string;
}): Promise<BackendUser> {
  const res = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (res.status === 409) {
    // User already exists (race condition) — fetch and return
    const existing = await fetchUserByClerkId(data.clerkId);
    if (existing) return existing;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to create user (${res.status}): ${body}`);
  }
  return res.json();
}

export async function updateBackendUser(
  userId: string,
  data: Partial<ProfileCustomization>,
): Promise<BackendUser> {
  const widgets = profileToWidgets(data);
  const body = {
    displayName: data.displayName ?? null,
    bio: data.bio ?? null,
    country: data.country ?? null,
    bannerUrl: data.bannerUrl ?? null,
    accentColor: data.accentColor ?? null,
    nameColor: data.nameColor ?? null,
    widgets: widgets.length ? JSON.stringify(widgets) : null,
  };

  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update user profile");
  return res.json();
}
