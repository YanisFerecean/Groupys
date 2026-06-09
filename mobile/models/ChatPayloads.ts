/**
 * Structured chat message payloads (chat × music plan, ticket 0.1).
 *
 * Each card-style `messageType` carries a typed JSON payload on `Message.payload`.
 * `MessagePayload` is a discriminated union keyed by `type` (mirroring the message's
 * `messageType`). New card types extend this union in their own tickets.
 */

/** A single track shared as a card (ticket 2.1). */
export interface TrackPayload {
  type: 'TRACK'
  /** Catalog id (Apple Music / Deezer). String to stay source-agnostic. */
  id: string
  title: string
  artist: string
  album?: string
  artworkUrl?: string
  /** 30s preview stream (free/public — no subscription needed). */
  previewUrl?: string
  /** `music://` or https Apple Music deep link. */
  appleMusicUrl?: string
  durationMs?: number
}

/** An album shared as a card (ticket 2.2). */
export interface AlbumPayload {
  type: 'ALBUM'
  id: string
  title: string
  artist: string
  artworkUrl?: string
  trackCount?: number
  appleMusicUrl?: string
}

/** A preview entry inside a playlist card. */
export interface PlaylistPreviewTrack {
  id: string
  title: string
  previewUrl: string
}

/** A playlist shared as a card (ticket 2.3). */
export interface PlaylistPayload {
  type: 'PLAYLIST'
  id: string
  title: string
  curator?: string
  artworkUrl?: string
  trackCount?: number
  appleMusicUrl?: string
  /** First N preview tracks the recipient can cycle through. */
  previews?: PlaylistPreviewTrack[]
}

export type MessagePayload = TrackPayload | AlbumPayload | PlaylistPayload

/** Narrow an unknown payload to a typed payload by its discriminant. */
export function isTrackPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is TrackPayload & Record<string, unknown> {
  return !!payload && payload.type === 'TRACK' && typeof payload.title === 'string'
}

export function isAlbumPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is AlbumPayload & Record<string, unknown> {
  return !!payload && payload.type === 'ALBUM' && typeof payload.title === 'string'
}

export function isPlaylistPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is PlaylistPayload & Record<string, unknown> {
  return !!payload && payload.type === 'PLAYLIST' && typeof payload.title === 'string'
}
