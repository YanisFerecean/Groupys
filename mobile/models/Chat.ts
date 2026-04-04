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

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderUsername: string
  senderDisplayName: string | null
  senderProfileImage: string | null
  content: string
  messageType: string
  isDeleted: boolean
  replyToId: string | null
  createdAt: string
  tempId?: string
  status?: 'sending' | 'sent' | 'failed'
}

export type PresenceStatus = 'online' | 'offline'

export interface WsInbound {
  type: string
  payload: Record<string, unknown>
}

export interface WsOutbound {
  type: string
  payload?: Record<string, unknown>
  conversationId?: string
  content?: string
  tempId?: string
}
