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
  /** Apple Music catalog song id (string) — required for full native Apple Music playback. */
  appleMusicId?: string
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

/** Server-built playlist shared and pinned inside a conversation (ticket 6.1). */
export interface CollabPlaylistPayload {
  type: 'COLLAB_PLAYLIST'
  id: string
  title: string
  curator?: string
  artworkUrl?: string
  trackCount: number
  previews?: PlaylistPreviewTrack[]
}

/** Auto-posted icebreaker on a new match (ticket 5.1). */
export interface TasteHandshakePayload {
  type: 'TASTE_HANDSHAKE'
  sharedArtists: string[]
  sharedGenres: string[]
  overlapScore: number
}

/** Track fields without the discriminant — embedded inside richer music payloads. */
export type TrackRef = Omit<TrackPayload, 'type'>

/** A dedicated song = a track plus a heartfelt note (ticket 4.3). */
export interface DedicationPayload extends TrackRef {
  type: 'DEDICATION'
  dedication: true
  note?: string
}

/** 1–4 lyric lines quoted from a track (ticket 4.1). */
export interface LyricPayload {
  type: 'LYRIC'
  track: TrackRef
  lines: string[]
  startTimeMs?: number
  endTimeMs?: number
}

/** "Listen from m:ss" deep link to a position in a track (ticket 4.2). */
export interface TimestampPayload {
  type: 'TIMESTAMP'
  track: TrackRef
  positionMs: number
}

/** Guess-the-song game card (ticket 4.6). Art/metadata hidden until guessed. */
export interface BlindListenPayload {
  type: 'BLIND_LISTEN'
  track: TrackRef
  hidden: boolean
  guessed: boolean
  guessCorrect?: boolean
  guessText?: string
}

/** OpenGraph metadata for a pasted public URL (ticket 3.7). */
export interface LinkPreviewPayload {
  type: 'LINK_PREVIEW'
  url: string
  title: string
  description?: string
  imageUrl?: string
  siteName?: string
}

/** Uploaded voice note metadata and compact waveform (ticket 3.8). */
export interface VoicePayload {
  type: 'VOICE'
  durationMs: number
  peaks: number[]
  /** Bundled royalty-free backing mixed locally on playback (ticket 4.4). */
  bed?: VoiceBedPayload
}

export interface VoiceBedPayload {
  id: string
  title: string
  kind: 'BUNDLED'
}

/** Server-catalog sticker message (ticket 3.9). */
export interface StickerPayload {
  type: 'STICKER'
  stickerId: string
  url: string
  name?: string
}

/**
 * Instagram-story-style music attached to a captured IMAGE/VIDEO. Rides inside the freeform
 * IMAGE/VIDEO message `payload` (no dedicated messageType). The snippet is a 30s window of the
 * **full** song, so playback needs Apple Music (`track.appleMusicId`); recipients without a
 * subscription fall back to the 30s `track.previewUrl`.
 */
export interface MediaMusicAttachment {
  track: TrackRef
  /** Start of the 30s window within the full song, in ms. */
  snippetStartMs: number
  /** Window length in ms (default 30000). */
  snippetDurationMs: number
  /** How the overlay is drawn over the media. */
  style: 'badge' | 'sticker' | 'lyric'
  /** Lyric line typed by the sender (only when `style === 'lyric'`). */
  lyric?: string
  /** Normalized 0..1 overlay position (draggable in the editor). */
  position: { x: number; y: number }
  /** For videos: mute the clip so the snippet is the soundtrack. */
  muteVideo?: boolean
}

export type MessagePayload =
  | TrackPayload
  | AlbumPayload
  | PlaylistPayload
  | CollabPlaylistPayload
  | TasteHandshakePayload
  | DedicationPayload
  | LyricPayload
  | TimestampPayload
  | BlindListenPayload
  | LinkPreviewPayload
  | VoicePayload
  | StickerPayload

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

export function isCollabPlaylistPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is CollabPlaylistPayload & Record<string, unknown> {
  return !!payload
    && payload.type === 'COLLAB_PLAYLIST'
    && typeof payload.title === 'string'
    && typeof payload.trackCount === 'number'
}

export function isTasteHandshakePayload(
  payload: Record<string, unknown> | null | undefined,
): payload is TasteHandshakePayload & Record<string, unknown> {
  return !!payload && payload.type === 'TASTE_HANDSHAKE' && Array.isArray(payload.sharedArtists)
}

export function isDedicationPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is DedicationPayload & Record<string, unknown> {
  return !!payload && payload.type === 'DEDICATION' && typeof payload.title === 'string'
}

export function isLyricPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is LyricPayload & Record<string, unknown> {
  return !!payload && payload.type === 'LYRIC' && Array.isArray(payload.lines)
}

export function isTimestampPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is TimestampPayload & Record<string, unknown> {
  return !!payload && payload.type === 'TIMESTAMP' && typeof payload.positionMs === 'number'
}

export function isBlindListenPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is BlindListenPayload & Record<string, unknown> {
  return !!payload && payload.type === 'BLIND_LISTEN' && typeof payload.track === 'object'
}

export function isLinkPreviewPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is LinkPreviewPayload & Record<string, unknown> {
  return !!payload
    && payload.type === 'LINK_PREVIEW'
    && typeof payload.url === 'string'
    && typeof payload.title === 'string'
}

export function isVoicePayload(
  payload: Record<string, unknown> | null | undefined,
): payload is VoicePayload & Record<string, unknown> {
  return !!payload
    && payload.type === 'VOICE'
    && typeof payload.durationMs === 'number'
    && Array.isArray(payload.peaks)
}

export function isStickerPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is StickerPayload & Record<string, unknown> {
  return !!payload
    && payload.type === 'STICKER'
    && typeof payload.stickerId === 'string'
    && typeof payload.url === 'string'
}

/** Narrow the optional `music` field embedded in an IMAGE/VIDEO message payload. */
export function isMediaMusicAttachment(
  value: unknown,
): value is MediaMusicAttachment {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return (
    typeof m.track === 'object'
    && m.track !== null
    && typeof m.snippetStartMs === 'number'
    && typeof m.snippetDurationMs === 'number'
    && (m.style === 'badge' || m.style === 'sticker' || m.style === 'lyric')
  )
}
