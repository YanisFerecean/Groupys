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
  isDeleted: boolean
  edited?: boolean
  replyToId: string | null
  replyTo?: ReplyStub | null
  /** Emoji reactions (ticket 3.2); clients aggregate counts + detect their own by userId. */
  reactions?: { emoji: string; userId: string }[]
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
  tempId?: string
  /** Now-playing / listen-together track fields (tickets 1.1 / 7.1). */
  track?: NowPlayingTrack | Record<string, unknown> | null
  isPlaying?: boolean
  /** Blind-listen guess fields (ticket 4.6). */
  messageId?: string
  guess?: string
  /** Listen-together room fields (ticket 7.1). */
  positionMs?: number
  emoji?: string
}
