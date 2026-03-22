import type { ProfileCustomization } from '@/models/ProfileCustomization'

const API_URL = process.env.EXPO_PUBLIC_API_URL!

export async function apiFetch<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

// ── Backend User types ──────────────────────────────────────────────────────

interface BackendWidget {
  type: string
  color: string | null
  pos: number
  data: unknown
}

type UnknownRecord = Record<string, unknown>

export interface BackendUser {
  id: string
  clerkId: string
  username: string
  displayName: string | null
  bio: string | null
  country: string | null
  bannerUrl: string | null
  accentColor: string | null
  nameColor: string | null
  profileImage: string | null
  widgets: string | null
  dateJoined: string
}

// ── Widget conversion ───────────────────────────────────────────────────────

function parseWidgets(raw: string | null): BackendWidget[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed as BackendWidget[]

    // Some stored rows are double-encoded JSON strings.
    if (typeof parsed === 'string') {
      const nested = JSON.parse(parsed) as unknown
      if (Array.isArray(nested)) return nested as BackendWidget[]
    }

    return []
  } catch {
    return []
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null
}

function parseRecord(value: unknown): UnknownRecord {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      const asObj = asRecord(parsed)
      if (asObj) return asObj

      if (typeof parsed === 'string') {
        const nested = JSON.parse(parsed) as unknown
        return asRecord(nested) ?? {}
      }
    } catch {
      return {}
    }
    return {}
  }

  return asRecord(value) ?? {}
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const str = asString(value)
    if (str) return str
  }
  return undefined
}

function pickArtistName(value: unknown): string | undefined {
  const artistObj = asRecord(value)
  return firstString(value, artistObj?.name)
}

function pickArtistImage(value: unknown): string | undefined {
  const artistObj = asRecord(value)
  const images = Array.isArray(artistObj?.images) ? artistObj.images : []
  const firstArrayImage = images.find((img) => typeof img === 'string')

  return firstString(
    artistObj?.imageUrl,
    artistObj?.image,
    artistObj?.picture,
    artistObj?.pictureSmall,
    artistObj?.pictureMedium,
    artistObj?.pictureBig,
    artistObj?.pictureXl,
    firstArrayImage,
  )
}

function normalizeTrackItem(item: UnknownRecord) {
  const album = asRecord(item.album)
  return {
    id: typeof item.id === 'number' ? item.id : undefined,
    title: firstString(item.title, item.name) ?? '',
    artist: pickArtistName(item.artist) ?? '',
    coverUrl: firstString(
      item.coverUrl,
      item.cover,
      item.imageUrl,
      item.image,
      album?.coverUrl,
      album?.cover,
      album?.coverSmall,
      album?.coverMedium,
      album?.coverBig,
      album?.coverXl,
    ),
    previewUrl: asString(item.previewUrl) ?? asString(item.preview),
  }
}

function normalizeAlbumItem(item: UnknownRecord) {
  return {
    title: firstString(item.title, item.name) ?? '',
    artist: pickArtistName(item.artist) ?? '',
    coverUrl: firstString(
      item.coverUrl,
      item.cover,
      item.imageUrl,
      item.image,
      item.coverSmall,
      item.coverMedium,
      item.coverBig,
      item.coverXl,
    ),
  }
}

function normalizeArtistItem(item: UnknownRecord) {
  return {
    id: typeof item.id === 'number' ? item.id : undefined,
    name: firstString(item.name, item.title) ?? '',
    genre: asString(item.genre),
    imageUrl: firstString(
      item.imageUrl,
      item.image,
      item.picture,
      item.pictureSmall,
      item.pictureMedium,
      item.pictureBig,
      item.pictureXl,
      pickArtistImage(item),
    ),
  }
}

function widgetsToProfile(widgets: BackendWidget[]): Partial<ProfileCustomization> {
  const result: Partial<ProfileCustomization> = {}

  for (const w of widgets) {
    const data = parseRecord(w.data)
    const items = Array.isArray(data.items) ? data.items : []

    switch (w.type) {
      case 'topSongs':
        result.topSongs = items
          .map((i) => asRecord(i))
          .filter((i): i is UnknownRecord => i !== null)
          .map(normalizeTrackItem)
          .filter((i) => i.title || i.artist)
        result.songsContainerColor = w.color ?? undefined
        break
      case 'topArtists':
        result.topArtists = items
          .map((i) => asRecord(i))
          .filter((i): i is UnknownRecord => i !== null)
          .map(normalizeArtistItem)
          .filter((i) => i.name)
        result.artistsContainerColor = w.color ?? undefined
        break
      case 'topAlbums':
        result.topAlbums = items
          .map((i) => asRecord(i))
          .filter((i): i is UnknownRecord => i !== null)
          .map(normalizeAlbumItem)
          .filter((i) => i.title || i.artist)
        result.albumsContainerColor = w.color ?? undefined
        break
      case 'currentlyListening': {
        const d = asRecord(data) ?? {}
        const track = normalizeTrackItem(d)
        if (track.title) {
          result.currentlyListening = {
            title: track.title,
            artist: track.artist,
            coverUrl: track.coverUrl,
          }
        }
        break
      }
    }
  }

  return result
}

function profileToWidgets(profile: Partial<ProfileCustomization>): BackendWidget[] {
  const widgets: BackendWidget[] = []
  let pos = 0

  if (profile.topAlbums?.length) {
    widgets.push({
      type: 'topAlbums',
      color: profile.albumsContainerColor ?? null,
      pos: pos++,
      data: { items: profile.topAlbums },
    })
  }

  if (profile.currentlyListening?.title) {
    widgets.push({
      type: 'currentlyListening',
      color: null,
      pos: pos++,
      data: { ...profile.currentlyListening },
    })
  }

  if (profile.topSongs?.length) {
    widgets.push({
      type: 'topSongs',
      color: profile.songsContainerColor ?? null,
      pos: pos++,
      data: { items: profile.topSongs },
    })
  }

  if (profile.topArtists?.length) {
    widgets.push({
      type: 'topArtists',
      color: profile.artistsContainerColor ?? null,
      pos: pos++,
      data: { items: profile.topArtists },
    })
  }

  return widgets
}

export function backendUserToProfile(user: BackendUser): ProfileCustomization {
  return {
    displayName: user.displayName ?? undefined,
    bio: user.bio ?? undefined,
    country: user.country ?? undefined,
    bannerUrl: user.bannerUrl ?? undefined,
    accentColor: user.accentColor ?? undefined,
    nameColor: user.nameColor ?? undefined,
    ...widgetsToProfile(parseWidgets(user.widgets)),
  }
}

// ── API helpers ─────────────────────────────────────────────────────────────

function makeHeaders(token: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function fetchUserByClerkId(
  clerkId: string,
  token: string | null,
): Promise<BackendUser | null> {
  const res = await fetch(
    `${API_URL}/users/clerk/${encodeURIComponent(clerkId)}`,
    { headers: makeHeaders(token) },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch user (${res.status})`)
  return res.json()
}

export async function createBackendUser(
  data: {
    clerkId: string
    username: string
    displayName?: string
    bio?: string
  },
  token: string | null,
): Promise<BackendUser> {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: makeHeaders(token),
    body: JSON.stringify(data),
  })

  if (res.status === 409) {
    const existing = await fetchUserByClerkId(data.clerkId, token)
    if (existing) return existing
  }

  if (!res.ok) throw new Error(`Failed to create user (${res.status})`)
  return res.json()
}

export async function updateBackendUser(
  userId: string,
  data: Partial<ProfileCustomization>,
  token: string | null,
): Promise<BackendUser> {
  const widgets = profileToWidgets(data)
  const body = {
    displayName: data.displayName ?? null,
    bio: data.bio ?? null,
    country: data.country ?? null,
    bannerUrl: data.bannerUrl ?? null,
    accentColor: data.accentColor ?? null,
    nameColor: data.nameColor ?? null,
    widgets: widgets.length ? JSON.stringify(widgets) : null,
  }

  const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: makeHeaders(token),
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Failed to update user (${res.status})`)
  return res.json()
}
