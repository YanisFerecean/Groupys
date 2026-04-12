import type { ProfileCustomization } from '@/models/ProfileCustomization'
import { ApiError, apiRequest } from '@/lib/apiRequest'
import { API_URL } from '@/lib/config'
import {
  buildWidgetSyncFlags,
  resolveMusicConnected,
  resolveMusicSync,
  resolveWidgetSyncFlags,
} from '@/lib/musicCompatibility'
import { getMusicErrorMessage } from '@/lib/musicErrors'

export { API_URL }
export { getMusicErrorMessage }

export async function apiFetch<T>(path: string, token: string | null, cache = true): Promise<T> {
  return apiRequest<T>(path, { token, cache })
}

// ── Backend User types ──────────────────────────────────────────────────────

interface BackendWidget {
  type: string
  color: string | null
  pos: number
  data: unknown
}

type UnknownRecord = Record<string, unknown>
const DEFAULT_WIDGET_ORDER = ['topAlbums', 'currentlyListening', 'topSongs', 'topArtists']

export interface BackendUser {
  id: string
  clerkId: string
  username: string
  displayName: string | null
  bio: string | null
  country: string | null
  bannerUrl: string | null
  bannerText: string | null
  accentColor: string | null
  nameColor: string | null
  profileImage: string | null
  widgets: string | null
  dateJoined: string
  tags?: string[]
  musicConnected?: boolean
  /**
   * @deprecated legacy alias from older backend payloads
   */
  spotifyConnected?: boolean
  isVerified?: boolean
  website?: string | null
  jobTitle?: string | null
  location?: string | null
  followerCount?: number
  followingCount?: number
}

export interface MusicTrackRes {
  title: string
  artist: string
  coverUrl?: string | null
}

export interface MusicArtistRes {
  name: string
  imageUrl?: string | null
}

export interface MusicAlbumRes {
  title: string
  artist: string
  coverUrl?: string | null
}

export type SpotifyTrackRes = MusicTrackRes
export type SpotifyArtistRes = MusicArtistRes
export type SpotifyAlbumRes = MusicAlbumRes

export interface MusicDeveloperTokenRes {
  token: string
  expiresAtEpochSeconds: number
}

// ── Widget conversion ───────────────────────────────────────────────────────

export function parseWidgets(raw: string | null): BackendWidget[] {
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
    id: typeof item.id === 'number' ? item.id : undefined,
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

export function widgetsToProfile(widgets: BackendWidget[]): Partial<ProfileCustomization> {
  const sorted = [...widgets].sort((a, b) => a.pos - b.pos)
  const result: Partial<ProfileCustomization> = {
    widgetOrder: sorted.map(w => w.type),
  }

  for (const w of sorted) {
    const data = parseRecord(w.data)
    const items = Array.isArray(data.items) ? data.items : []
    const isHidden = data.hidden === true
    const size = data.size === 'small' || data.size === 'normal' ? data.size : undefined

    switch (w.type) {
      case 'topSongs':
        {
          const synced = resolveWidgetSyncFlags(data)
          result.syncTopSongsWithMusic = synced
          result.syncTopSongsWithSpotify = synced
        }
        result.topSongs = items
          .map((i) => asRecord(i))
          .filter((i): i is UnknownRecord => i !== null)
          .map(normalizeTrackItem)
          .filter((i) => i.title || i.artist)
        result.songsContainerColor = w.color ?? undefined
        if (size) {
          result.widgetSizes = { ...(result.widgetSizes ?? {}), topSongs: size }
        }
        if (isHidden) {
          result.hiddenWidgets = [...(result.hiddenWidgets ?? []), 'topSongs']
        }
        break
      case 'topArtists':
        {
          const synced = resolveWidgetSyncFlags(data)
          result.syncTopArtistsWithMusic = synced
          result.syncTopArtistsWithSpotify = synced
        }
        result.topArtists = items
          .map((i) => asRecord(i))
          .filter((i): i is UnknownRecord => i !== null)
          .map(normalizeArtistItem)
          .filter((i) => i.name)
        result.artistsContainerColor = w.color ?? undefined
        if (size) {
          result.widgetSizes = { ...(result.widgetSizes ?? {}), topArtists: size }
        }
        if (isHidden) {
          result.hiddenWidgets = [...(result.hiddenWidgets ?? []), 'topArtists']
        }
        break
      case 'topAlbums':
        {
          const synced = resolveWidgetSyncFlags(data)
          result.syncTopAlbumsWithMusic = synced
          result.syncTopAlbumsWithSpotify = synced
        }
        result.topAlbums = items
          .map((i) => asRecord(i))
          .filter((i): i is UnknownRecord => i !== null)
          .map(normalizeAlbumItem)
          .filter((i) => i.title || i.artist)
        result.albumsContainerColor = w.color ?? undefined
        if (size) {
          result.widgetSizes = { ...(result.widgetSizes ?? {}), topAlbums: size }
        }
        if (isHidden) {
          result.hiddenWidgets = [...(result.hiddenWidgets ?? []), 'topAlbums']
        }
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
        if (isHidden) {
          result.hiddenWidgets = [...(result.hiddenWidgets ?? []), 'currentlyListening']
        }
        break
      }
    }
  }

  return result
}

function profileToWidgets(profile: Partial<ProfileCustomization>): BackendWidget[] {
  type WidgetData = Omit<BackendWidget, 'pos'>
  const hidden = profile.hiddenWidgets ?? []
  const widgetMap: Partial<Record<string, WidgetData>> = {}
  const syncTopAlbums = resolveMusicSync(
    profile.syncTopAlbumsWithMusic,
    profile.syncTopAlbumsWithSpotify,
  )
  const syncTopSongs = resolveMusicSync(
    profile.syncTopSongsWithMusic,
    profile.syncTopSongsWithSpotify,
  )
  const syncTopArtists = resolveMusicSync(
    profile.syncTopArtistsWithMusic,
    profile.syncTopArtistsWithSpotify,
  )

  if (profile.topAlbums?.length || syncTopAlbums) {
    widgetMap.topAlbums = {
      type: 'topAlbums',
      color: profile.albumsContainerColor ?? null,
      data: {
        items: profile.topAlbums ?? [],
        ...buildWidgetSyncFlags(syncTopAlbums),
        size: profile.widgetSizes?.topAlbums ?? 'normal',
        hidden: hidden.includes('topAlbums'),
      },
    }
  }

  if (profile.currentlyListening?.title) {
    widgetMap.currentlyListening = {
      type: 'currentlyListening',
      color: null,
      data: {
        ...profile.currentlyListening,
        hidden: hidden.includes('currentlyListening'),
      },
    }
  }

  if (profile.topSongs?.length || syncTopSongs) {
    widgetMap.topSongs = {
      type: 'topSongs',
      color: profile.songsContainerColor ?? null,
      data: {
        items: profile.topSongs ?? [],
        ...buildWidgetSyncFlags(syncTopSongs),
        size: profile.widgetSizes?.topSongs ?? 'normal',
        hidden: hidden.includes('topSongs'),
      },
    }
  }

  if (profile.topArtists?.length || syncTopArtists) {
    widgetMap.topArtists = {
      type: 'topArtists',
      color: profile.artistsContainerColor ?? null,
      data: {
        items: profile.topArtists ?? [],
        ...buildWidgetSyncFlags(syncTopArtists),
        size: profile.widgetSizes?.topArtists ?? 'normal',
        hidden: hidden.includes('topArtists'),
      },
    }
  }

  const order = profile.widgetOrder ?? DEFAULT_WIDGET_ORDER
  const widgets: BackendWidget[] = []
  let pos = 0

  for (const type of order) {
    const widget = widgetMap[type]
    if (widget) {
      widgets.push({ ...widget, pos: pos++ })
      delete widgetMap[type]
    }
  }

  for (const widget of Object.values(widgetMap)) {
    if (widget) {
      widgets.push({ ...widget, pos: pos++ })
    }
  }

  return widgets
}

export function backendUserToProfile(user: BackendUser): ProfileCustomization {
  const musicConnected = resolveMusicConnected(user.musicConnected, user.spotifyConnected)
  return {
    id: user.id ?? undefined,
    displayName: user.displayName ?? undefined,
    bio: user.bio ?? undefined,
    country: user.country ?? undefined,
    tags: user.tags || [],
    musicConnected,
    spotifyConnected: musicConnected,
    bannerUrl: user.bannerUrl ?? undefined,
    bannerText: user.bannerText ?? undefined,
    accentColor: user.accentColor ?? undefined,
    nameColor: user.nameColor ?? undefined,
    isVerified: user.isVerified ?? false,
    website: user.website ?? undefined,
    jobTitle: user.jobTitle ?? undefined,
    location: user.location ?? undefined,
    followersCount: user.followerCount ?? 0,
    followingCount: user.followingCount ?? 0,
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

function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readApiErrorDetail(res: Response): Promise<string> {
  try {
    const payload = await res.json()
    return (
      (typeof payload?.message === 'string' && payload.message) ||
      (typeof payload?.error === 'string' && payload.error) ||
      (typeof payload?.detail === 'string' && payload.detail) ||
      (typeof payload?.title === 'string' && payload.title) ||
      ''
    )
  } catch {
    return ''
  }
}

export async function apiPost<T>(
  path: string,
  token: string | null,
  body: unknown,
): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', token, body })
}

export async function apiPut<T>(
  path: string,
  token: string | null,
  body: unknown,
): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', token, body })
}

export async function apiDelete(
  path: string,
  token: string | null,
): Promise<void> {
  return apiRequest<void>(path, { method: 'DELETE', token })
}

export async function deleteMyAccount(token: string | null): Promise<void> {
  return apiDelete('/users/me', token)
}

export async function apiPostMultipart<T>(
  path: string,
  token: string | null,
  formData: FormData,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeader(token),
    body: formData,
  })
  if (!res.ok) {
    const detail = await readApiErrorDetail(res)
    const message = detail || res.statusText || 'Request failed'
    throw new ApiError(res.status, `API error ${res.status}: ${message}`)
  }
  return res.json() as Promise<T>
}

export async function createPost(
  communityId: string,
  token: string,
  title: string,
  content: string,
  mediaList?: { uri: string; type?: string | null; name?: string | null }[],
): Promise<any> {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('content', content)

  if (mediaList && mediaList.length > 0) {
    const mimeByExtension: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      m4v: 'video/x-m4v',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      pdf: 'application/pdf',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      zip: 'application/zip',
      rar: 'application/vnd.rar',
    }

    for (let index = 0; index < mediaList.length; index += 1) {
      const media = mediaList[index]
      const normalizedUri = media.uri.split('?')[0]
      const uriName = normalizedUri.split('/').pop()
      const uriExt = uriName?.includes('.') ? uriName.split('.').pop()?.toLowerCase() : undefined
      const guessedMime = uriExt ? mimeByExtension[uriExt] : undefined
      const isVideo = media.type === 'video'
      const isImage = media.type === 'image'

      let mimeType: string
      if (media.type && media.type.includes('/')) {
        mimeType = media.type
      } else if (isVideo) {
        mimeType = guessedMime?.startsWith('video/') ? guessedMime : 'video/mp4'
      } else if (isImage) {
        mimeType = guessedMime?.startsWith('image/') ? guessedMime : 'image/jpeg'
      } else if (media.type && media.type !== 'application/octet-stream') {
        mimeType = media.type
      } else if (guessedMime) {
        mimeType = guessedMime
      } else {
        mimeType = 'application/octet-stream'
      }

      const defaultExt = uriExt || (mimeType.includes('/') ? mimeType.split('/')[1] : 'bin')
      const fallbackName = `upload_${Date.now()}_${index}.${defaultExt}`
      const fileName = media.name?.trim() || uriName || fallbackName

      const uploadFormData = new FormData()
      uploadFormData.append('file', {
        uri: media.uri,
        type: mimeType,
        name: fileName,
      } as any)

      const uploaded = await apiPostMultipart<{ url: string; type?: string }>(
        '/posts/media/upload',
        token,
        uploadFormData,
      )
      formData.append('mediaUrls', uploaded.url)
      formData.append('mediaTypes', uploaded.type || mimeType)
    }
  }

  return apiPostMultipart(`/posts/community/${communityId}`, token, formData)
}

export async function fetchMyPosts(token: string): Promise<any[]> {
  return apiFetch('/posts/mine', token)
}

export async function fetchPostsByAuthor(
  userId: string,
  token: string | null,
): Promise<any[]> {
  return apiFetch(`/posts/author/${encodeURIComponent(userId)}`, token, false)
}

export async function uploadCommunityMedia(
  token: string,
  uri: string,
  type: string = 'image',
): Promise<string> {
  const formData = new FormData()
  const ext = uri.split('.').pop() || 'jpg'
  const mimeType = type === 'video' ? `video/${ext}` : `image/${ext}`
  formData.append('file', {
    uri,
    type: mimeType,
    name: `upload_${Date.now()}.${ext}`,
  } as any)

  const res = await apiPostMultipart<{ url: string }>('/communities/media/upload', token, formData)
  return res.url
}

export { normalizeMediaUrl } from '@/lib/media'

export function mediaUrl(key: string): string {
  return `${API_URL}/posts/media/${key}`
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

export async function fetchUserById(
  userId: string,
  token: string | null,
): Promise<BackendUser | null> {
  const res = await fetch(
    `${API_URL}/users/${encodeURIComponent(userId)}`,
    { headers: makeHeaders(token) },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch user (${res.status})`)
  return res.json()
}

export async function fetchUserByUsername(
  username: string,
  token: string | null,
): Promise<BackendUser | null> {
  const res = await fetch(
    `${API_URL}/users/username/${encodeURIComponent(username)}`,
    { headers: makeHeaders(token) },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch user by username (${res.status})`)
  return res.json()
}

export async function createBackendUser(
  data: {
    clerkId: string
    username: string
    displayName?: string
    bio?: string
    profileImage?: string
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

    // If Clerk user was deleted/recreated, backend may still hold the previous
    // username under a different clerkId.
    const conflicting = await fetchUserByUsername(data.username, token)
    if (conflicting && conflicting.clerkId !== data.clerkId) {
      throw new Error('Failed to create user (409): Username is already taken in Groupys')
    }
  }

  if (!res.ok) {
    const detail = await readApiErrorDetail(res)
    throw new Error(`Failed to create user (${res.status})${detail ? `: ${detail}` : ''}`)
  }
  return res.json()
}

export async function upsertBackendUserIdentity(
  data: {
    clerkId: string
    username: string
    displayName: string
    profileImage?: string
  },
  token: string | null,
): Promise<BackendUser> {
  const existing = await fetchUserByClerkId(data.clerkId, token)

  if (!existing) {
    return createBackendUser(
      {
        clerkId: data.clerkId,
        username: data.username,
        displayName: data.displayName,
        profileImage: data.profileImage,
      },
      token,
    )
  }

  const res = await fetch(`${API_URL}/users/${encodeURIComponent(existing.id)}`, {
    method: 'PUT',
    headers: makeHeaders(token),
    body: JSON.stringify({
      displayName: data.displayName,
      bio: existing.bio ?? null,
      country: existing.country ?? null,
      bannerUrl: existing.bannerUrl ?? null,
      bannerText: existing.bannerText ?? null,
      accentColor: existing.accentColor ?? null,
      nameColor: existing.nameColor ?? null,
      profileImage: data.profileImage ?? existing.profileImage ?? null,
      website: existing.website ?? null,
      jobTitle: existing.jobTitle ?? null,
      location: existing.location ?? null,
      widgets: existing.widgets ?? null,
      tags: existing.tags ?? null,
    }),
  })

  if (!res.ok) {
    const detail = await readApiErrorDetail(res)
    throw new Error(`Failed to update user identity (${res.status})${detail ? `: ${detail}` : ''}`)
  }
  return res.json()
}

export async function syncUserProfileImage(
  user: BackendUser,
  profileImage: string,
  token: string | null,
): Promise<BackendUser> {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(user.id)}`, {
    method: 'PUT',
    headers: makeHeaders(token),
    body: JSON.stringify({
      displayName: user.displayName ?? null,
      bio: user.bio ?? null,
      country: user.country ?? null,
      bannerUrl: user.bannerUrl ?? null,
      accentColor: user.accentColor ?? null,
      nameColor: user.nameColor ?? null,
      profileImage,
      widgets: user.widgets ?? null,
      tags: user.tags ?? null,
    }),
  })
  if (!res.ok) throw new Error(`Failed to sync profile image (${res.status})`)
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
    tags: data.tags ?? null,
    bannerUrl: data.bannerUrl ?? null,
    bannerText: data.bannerText ?? null,
    accentColor: data.accentColor ?? null,
    nameColor: data.nameColor ?? null,
    website: data.website ?? null,
    jobTitle: data.jobTitle ?? null,
    location: data.location ?? null,
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

// ── Discovery Helpers ───────────────────────────────────────────────────────

import type { SuggestedCommunity } from '@/models/SuggestedCommunity'
import type { SuggestedUser } from '@/models/SuggestedUser'
import type { CommunityResDto } from '@/models/CommunityRes'

export async function searchCommunities(query: string, token: string | null): Promise<CommunityResDto[]> {
  return apiFetch<CommunityResDto[]>(
    `/communities/search?q=${encodeURIComponent(query)}`,
    token,
    false,
  )
}

export async function fetchSuggestedCommunities(
  token: string | null,
  limit: number = 20,
  refresh: boolean = false,
): Promise<SuggestedCommunity[]> {
  return apiFetch<SuggestedCommunity[]>(
    `/discovery/communities/suggested?limit=${limit}&refresh=${refresh}`,
    token,
    !refresh,
  )
}

export async function fetchSuggestedUsers(
  token: string | null,
  limit: number = 20,
  refresh: boolean = false,
): Promise<SuggestedUser[]> {
  return apiFetch<SuggestedUser[]>(
    `/discovery/users/suggested?limit=${limit}&refresh=${refresh}`,
    token,
    !refresh,
  )
}

export async function dismissRecommendation(
  targetType: 'community' | 'user',
  targetId: string,
  token: string | null,
): Promise<void> {
  await apiPost(`/discovery/recommendations/${targetType}/${encodeURIComponent(targetId)}/dismiss`, token, {
    actionType: 'DISMISS',
    surface: 'PEOPLE',
  })
}

export async function getMusicDeveloperToken(
  token: string | null,
): Promise<MusicDeveloperTokenRes> {
  return apiFetch<MusicDeveloperTokenRes>('/music/developer-token', token, false)
}

export async function connectMusic(
  token: string | null,
  musicUserToken: string,
): Promise<unknown> {
  return apiPost('/music/connect', token, { musicUserToken })
}

export async function disconnectMusic(
  token: string | null,
): Promise<void> {
  await apiDelete('/music/disconnect', token)
}

export async function syncMusic(
  token: string | null,
): Promise<void> {
  await apiPost('/discovery/music/sync', token, {})
}

export const syncSpotifyMusic = syncMusic

export async function fetchMusicTopTracks(
  token: string | null,
): Promise<MusicTrackRes[]> {
  return apiFetch<MusicTrackRes[]>('/music/top-tracks', token, false)
}

export async function fetchMusicTopTracksByUserId(
  userId: string,
  token: string | null,
): Promise<MusicTrackRes[]> {
  return apiFetch<MusicTrackRes[]>(
    `/music/users/${encodeURIComponent(userId)}/top-tracks`,
    token,
    false,
  )
}

export async function fetchMusicTopArtists(
  token: string | null,
): Promise<MusicArtistRes[]> {
  return apiFetch<MusicArtistRes[]>('/music/top-artists', token, false)
}

export async function fetchMusicTopArtistsByUserId(
  userId: string,
  token: string | null,
): Promise<MusicArtistRes[]> {
  return apiFetch<MusicArtistRes[]>(
    `/music/users/${encodeURIComponent(userId)}/top-artists`,
    token,
    false,
  )
}

export async function fetchMusicTopAlbums(
  token: string | null,
): Promise<MusicAlbumRes[]> {
  return apiFetch<MusicAlbumRes[]>('/music/top-albums', token, false)
}

export async function fetchMusicTopAlbumsByUserId(
  userId: string,
  token: string | null,
): Promise<MusicAlbumRes[]> {
  return apiFetch<MusicAlbumRes[]>(
    `/music/users/${encodeURIComponent(userId)}/top-albums`,
    token,
    false,
  )
}

export async function fetchMusicCurrentlyPlaying(
  token: string | null,
): Promise<MusicTrackRes | null> {
  const res = await fetch(`${API_URL}/music/currently-playing`, {
    headers: makeHeaders(token),
  })
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) {
    throw new ApiError(res.status, await readApiErrorDetail(res) || `Failed to fetch currently playing (${res.status})`)
  }
  return res.json()
}

export async function fetchMusicCurrentlyPlayingByUserId(
  userId: string,
  token: string | null,
): Promise<MusicTrackRes | null> {
  const res = await fetch(`${API_URL}/music/users/${encodeURIComponent(userId)}/currently-playing`, {
    headers: makeHeaders(token),
  })
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) {
    throw new ApiError(res.status, await readApiErrorDetail(res) || `Failed to fetch currently playing (${res.status})`)
  }
  return res.json()
}

export const fetchSpotifyTopTracks = fetchMusicTopTracks
export const fetchSpotifyTopTracksByUserId = fetchMusicTopTracksByUserId
export const fetchSpotifyTopArtists = fetchMusicTopArtists
export const fetchSpotifyTopArtistsByUserId = fetchMusicTopArtistsByUserId
export const fetchSpotifyTopAlbums = fetchMusicTopAlbums
export const fetchSpotifyTopAlbumsByUserId = fetchMusicTopAlbumsByUserId
export const fetchSpotifyCurrentlyPlaying = fetchMusicCurrentlyPlaying
export const fetchSpotifyCurrentlyPlayingByUserId = fetchMusicCurrentlyPlayingByUserId

export async function followUser(
  userId: string,
  token: string | null,
): Promise<void> {
  await apiPost(`/users/${encodeURIComponent(userId)}/follow`, token, {})
}

export async function likeUser(
  userId: string,
  token: string | null,
): Promise<import('@/models/Match').LikeResponse> {
  return apiPost<import('@/models/Match').LikeResponse>(
    `/discovery/users/${encodeURIComponent(userId)}/like`,
    token,
    {},
  )
}

export async function passUser(
  userId: string,
  token: string | null,
): Promise<void> {
  await apiPost(`/discovery/users/${encodeURIComponent(userId)}/pass`, token, {})
}

// ── Album Ratings ───────────────────────────────────────────────────────────

export interface AlbumRatingRes {
  id: string
  albumId: number
  albumTitle: string
  albumCoverUrl: string | null
  artistName: string | null
  userId: string
  username: string
  displayName: string | null
  profileImage: string | null
  score: number
  review: string | null
  createdAt: string
  updatedAt: string
}

export interface AlbumRatingCreate {
  albumId: number
  albumTitle: string
  albumCoverUrl: string | null
  artistName: string | null
  score: number
  review: string | null
}

export async function fetchAlbumRatings(
  albumId: number,
  token: string | null,
): Promise<AlbumRatingRes[]> {
  return apiFetch<AlbumRatingRes[]>(`/album-ratings/album/${albumId}`, token, false)
}

export async function upsertAlbumRating(
  body: AlbumRatingCreate,
  token: string | null,
): Promise<AlbumRatingRes> {
  return apiPost<AlbumRatingRes>('/album-ratings', token, body)
}

export async function fetchMyAlbumRatings(
  token: string | null,
): Promise<AlbumRatingRes[]> {
  return apiFetch<AlbumRatingRes[]>('/album-ratings/mine', token, false)
}

export async function fetchAlbumRatingsByUsername(
  username: string,
  token: string | null,
): Promise<AlbumRatingRes[]> {
  return apiFetch<AlbumRatingRes[]>(
    `/album-ratings/user/${encodeURIComponent(username)}`,
    token,
    false,
  )
}

export async function deleteAlbumRating(
  ratingId: string,
  token: string | null,
): Promise<void> {
  return apiDelete(`/album-ratings/${encodeURIComponent(ratingId)}`, token)
}
