// ── Structured message payloads ──────────────────────────────────────────────
// Mirrors the mobile app's models/ChatPayloads.ts so web renders/sends the same
// card-style messages. Each card `messageType` carries a typed JSON `payload`.

/** A single track shared as a card. */
export interface TrackPayload {
  type: "TRACK";
  /** Catalog id (Apple Music / Deezer). String to stay source-agnostic. */
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  /** 30s preview stream (free/public — no subscription needed). */
  previewUrl?: string;
  /** `music://` or https Apple Music deep link. */
  appleMusicUrl?: string;
  /** Apple Music catalog song id — lets subscribed native clients play the full song. */
  appleMusicId?: string;
  durationMs?: number;
}

/** An album shared as a card. */
export interface AlbumPayload {
  type: "ALBUM";
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  trackCount?: number;
  appleMusicUrl?: string;
}

/** A preview entry inside a playlist card. */
export interface PlaylistPreviewTrack {
  id: string;
  title: string;
  previewUrl: string;
}

/** A playlist shared as a card. */
export interface PlaylistPayload {
  type: "PLAYLIST";
  id: string;
  title: string;
  curator?: string;
  artworkUrl?: string;
  trackCount?: number;
  appleMusicUrl?: string;
  previews?: PlaylistPreviewTrack[];
}

/** Server-built playlist shared and pinned inside a conversation. */
export interface CollabPlaylistPayload {
  type: "COLLAB_PLAYLIST";
  id: string;
  title: string;
  curator?: string;
  artworkUrl?: string;
  trackCount: number;
  previews?: PlaylistPreviewTrack[];
}

/** Auto-posted icebreaker on a new match. */
export interface TasteHandshakePayload {
  type: "TASTE_HANDSHAKE";
  sharedArtists: string[];
  sharedGenres: string[];
  overlapScore: number;
}

/** Track fields without the discriminant — embedded inside richer music payloads. */
export type TrackRef = Omit<TrackPayload, "type">;

/** A dedicated song = a track plus a heartfelt note. */
export interface DedicationPayload extends TrackRef {
  type: "DEDICATION";
  dedication: true;
  note?: string;
}

/** 1–4 lyric lines quoted from a track. */
export interface LyricPayload {
  type: "LYRIC";
  track: TrackRef;
  lines: string[];
  startTimeMs?: number;
  endTimeMs?: number;
}

/** "Listen from m:ss" deep link to a position in a track. */
export interface TimestampPayload {
  type: "TIMESTAMP";
  track: TrackRef;
  positionMs: number;
}

/** Guess-the-song game card. Art/metadata hidden until guessed. */
export interface BlindListenPayload {
  type: "BLIND_LISTEN";
  track: TrackRef;
  hidden: boolean;
  guessed: boolean;
  guessCorrect?: boolean;
  guessText?: string;
}

/** OpenGraph metadata for a pasted public URL. */
export interface LinkPreviewPayload {
  type: "LINK_PREVIEW";
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

/** Bundled royalty-free backing track mixed locally on playback. */
export interface VoiceBedPayload {
  id: string;
  title: string;
  kind: "BUNDLED";
}

/** Uploaded voice note metadata and compact waveform. */
export interface VoicePayload {
  type: "VOICE";
  durationMs: number;
  peaks: number[];
  bed?: VoiceBedPayload;
}

/** Server-catalog sticker message. */
export interface StickerPayload {
  type: "STICKER";
  stickerId: string;
  url: string;
  name?: string;
}

/**
 * Instagram-story-style music attached to a captured IMAGE/VIDEO (authored in the mobile
 * camera). Rides inside the freeform IMAGE/VIDEO message `payload` — no dedicated messageType.
 * The snippet is a 30s window of the *full* song, which only Apple Music subscribers on the
 * native app can play; web falls back to the free 30s `track.previewUrl`.
 */
export interface MediaMusicAttachment {
  track: TrackRef;
  /** Start of the 30s window within the full song, in ms. */
  snippetStartMs: number;
  /** Window length in ms (default 30000). */
  snippetDurationMs: number;
  /** How the overlay is drawn over the media. */
  style: "badge" | "sticker" | "lyric";
  /** Lyric line typed by the sender (only when `style === "lyric"`). */
  lyric?: string;
  /** Normalized 0..1 overlay position. */
  position: { x: number; y: number };
  /** For videos: the clip is muted so the snippet is the soundtrack. */
  muteVideo?: boolean;
}

/** Freeform payload carried by IMAGE / VIDEO messages (all fields optional for legacy sends). */
export interface MediaPayload {
  width?: number;
  height?: number;
  mime?: string;
  music?: MediaMusicAttachment;
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
  | StickerPayload;

/** Raw JSON payload shape as it arrives on a Message (untyped until narrowed). */
export type RawPayload = Record<string, unknown> | null;

/** Narrows the optional `music` field embedded in an IMAGE/VIDEO message payload. */
export function isMediaMusicAttachment(value: unknown): value is MediaMusicAttachment {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  const track = m.track as Record<string, unknown> | undefined;
  const position = m.position as Record<string, unknown> | undefined;
  return (
    !!track &&
    typeof track === "object" &&
    typeof track.title === "string" &&
    typeof m.snippetStartMs === "number" &&
    typeof m.snippetDurationMs === "number" &&
    (m.style === "badge" || m.style === "sticker" || m.style === "lyric") &&
    !!position &&
    typeof position.x === "number" &&
    typeof position.y === "number"
  );
}

/** Reads a positive numeric field off a raw payload (e.g. media width/height). */
export function payloadNumber(payload: RawPayload | undefined, key: string): number | undefined {
  const value = payload?.[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

// ── Payload type guards ──────────────────────────────────────────────────────

export function isTrackPayload(p: RawPayload | undefined): p is TrackPayload & Record<string, unknown> {
  return !!p && p.type === "TRACK" && typeof p.title === "string";
}
export function isAlbumPayload(p: RawPayload | undefined): p is AlbumPayload & Record<string, unknown> {
  return !!p && p.type === "ALBUM" && typeof p.title === "string";
}
export function isPlaylistPayload(p: RawPayload | undefined): p is PlaylistPayload & Record<string, unknown> {
  return !!p && p.type === "PLAYLIST" && typeof p.title === "string";
}
export function isCollabPlaylistPayload(p: RawPayload | undefined): p is CollabPlaylistPayload & Record<string, unknown> {
  return !!p && p.type === "COLLAB_PLAYLIST" && typeof p.title === "string" && typeof p.trackCount === "number";
}
export function isTasteHandshakePayload(p: RawPayload | undefined): p is TasteHandshakePayload & Record<string, unknown> {
  return !!p && p.type === "TASTE_HANDSHAKE" && Array.isArray(p.sharedArtists);
}
export function isDedicationPayload(p: RawPayload | undefined): p is DedicationPayload & Record<string, unknown> {
  return !!p && p.type === "DEDICATION" && typeof p.title === "string";
}
export function isLyricPayload(p: RawPayload | undefined): p is LyricPayload & Record<string, unknown> {
  return !!p && p.type === "LYRIC" && Array.isArray(p.lines);
}
export function isTimestampPayload(p: RawPayload | undefined): p is TimestampPayload & Record<string, unknown> {
  return !!p && p.type === "TIMESTAMP" && typeof p.positionMs === "number";
}
export function isBlindListenPayload(p: RawPayload | undefined): p is BlindListenPayload & Record<string, unknown> {
  return !!p && p.type === "BLIND_LISTEN" && typeof p.track === "object";
}
export function isLinkPreviewPayload(p: RawPayload | undefined): p is LinkPreviewPayload & Record<string, unknown> {
  return !!p && p.type === "LINK_PREVIEW" && typeof p.url === "string" && typeof p.title === "string";
}
export function isVoicePayload(p: RawPayload | undefined): p is VoicePayload & Record<string, unknown> {
  return !!p && p.type === "VOICE" && typeof p.durationMs === "number" && Array.isArray(p.peaks);
}
export function isStickerPayload(p: RawPayload | undefined): p is StickerPayload & Record<string, unknown> {
  return !!p && p.type === "STICKER" && typeof p.stickerId === "string" && typeof p.url === "string";
}

// ── Conversation & message models ────────────────────────────────────────────

export interface Participant {
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  lastReadAt: string | null;
  lastSeenAt: string | null;
  /** Whether this participant has an active music subscription; gates Listen Together. */
  musicSubscriptionActive?: boolean;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  groupName: string | null;
  participants: Participant[];
  requestStatus: "ACCEPTED" | "PENDING_INCOMING" | "PENDING_OUTGOING";
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  mutedUntil?: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/** Lightweight reference to a replied-to message. */
export interface ReplyStub {
  id: string;
  senderUsername: string;
  senderDisplayName: string | null;
  messageType: string;
  snippet: string;
}

/** Typed emoji / track reaction on a message. */
export interface MessageReaction {
  type?: "emoji" | "track";
  emoji?: string | null;
  track?: TrackPayload | null;
  userId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string | null;
  senderProfileImage: string | null;
  content: string;
  messageType: string;
  /** Structured card payload for non-text message types. */
  payload?: RawPayload;
  /** Uploaded media reference for IMAGE / VOICE messages. */
  mediaUrl?: string | null;
  isDeleted: boolean;
  edited?: boolean;
  replyToId: string | null;
  replyTo?: ReplyStub | null;
  /** Typed emoji / track reactions. */
  reactions?: MessageReaction[];
  createdAt: string;
  tempId?: string; // Client-only: used for optimistic updates
  status?: "sending" | "sent" | "failed"; // Client-only
}

export type PresenceStatus = "online" | "offline";

/** A user's currently-playing track, broadcast as presence. */
export interface NowPlayingTrack {
  id?: string | null;
  title: string;
  artist?: string | null;
  album?: string | null;
  artworkUrl?: string | null;
}

export interface NowPlayingState {
  track: NowPlayingTrack | null;
  isPlaying: boolean;
}

export interface NowPlayingMessage extends NowPlayingState {
  userId: string;
}

// ── WebSocket envelopes ──────────────────────────────────────────────────────

export interface WsInbound {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Outbound WS frame. Loose by design: the client JSON-stringifies whatever it's
 * given, and different message types carry different top-level fields
 * (messageId, emoji, track, positionMs, …). Keep `type` required and allow the
 * rest so every event in the chat protocol can be expressed without casts.
 */
export interface WsOutbound {
  type: string;
  [key: string]: unknown;
}
