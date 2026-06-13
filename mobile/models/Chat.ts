import type { TrackPayload } from '@/models/ChatPayloads'

export type ConversationRequestStatus =
  | 'ACCEPTED'
  | 'PENDING_INCOMING'
  | 'PENDING_OUTGOING'

export interface Participant {
  userId: string
  username: string
  displayName: string | null
  profileImage: string | null
  lastReadAt: string | null
  lastSeenAt: string | null
  /** Whether this participant has an active Apple Music subscription; gates Listen Together. */
  musicSubscriptionActive: boolean
}

export interface Conversation {
  id: string
  isGroup: boolean
  groupName: string | null
  participants: Participant[]
  requestStatus: ConversationRequestStatus
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  mutedUntil: string | null
  createdAt: string
  updatedAt: string | null
}

/** Lightweight reference to a replied-to message (ticket 3.1). */
export interface ReplyStub {
  id: string
  senderUsername: string
  senderDisplayName: string | null
  messageType: string
  snippet: string
}

export interface MessageReaction {
  type?: 'emoji' | 'track'
  emoji?: string | null
  track?: TrackPayload | null
  userId: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderUsername: string
  senderDisplayName: string | null
  senderProfileImage: string | null
  content: string
  messageType: string
  /** Structured card payload for non-text message types (see models/ChatPayloads.ts). */
  payload?: Record<string, unknown> | null
  /** Uploaded media reference for IMAGE messages. */
  mediaUrl?: string | null
  isDeleted: boolean
  edited?: boolean
  replyToId: string | null
  replyTo?: ReplyStub | null
  /** Typed emoji / track reactions (tickets 3.2 / 4.5). */
  reactions?: MessageReaction[]
  createdAt: string
  tempId?: string
  status?: 'sending' | 'sent' | 'failed'
}

export type PresenceStatus = 'online' | 'offline'

/** A user's currently-playing track, broadcast as presence (ticket 1.1). */
export interface NowPlayingTrack {
  id?: string | null
  title: string
  artist?: string | null
  album?: string | null
  artworkUrl?: string | null
}

export interface NowPlayingState {
  track: NowPlayingTrack | null
  isPlaying: boolean
}

export interface NowPlayingMessage extends NowPlayingState {
  userId: string
}

export interface WsInbound {
  type: string
  payload: Record<string, unknown>
}

export interface WsOutbound {
  type: string
  payload?: Record<string, unknown>
  conversationId?: string
  content?: string
  messageType?: string
  mediaUrl?: string
  tempId?: string
  /** Now-playing / listen-together track fields (tickets 1.1 / 7.1). */
  track?: NowPlayingTrack | Record<string, unknown> | null
  isPlaying?: boolean
  /** Blind-listen guess fields (ticket 4.6). */
  messageId?: string
  trackId?: string
  guess?: string
  /** Listen-together room fields (ticket 7.1). */
  positionMs?: number
  emoji?: string
}
