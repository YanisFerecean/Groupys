import type { BackendUser } from '@/lib/api'
import { apiRequest } from '@/lib/apiRequest'
import type { Conversation, Message } from '@/models/Chat'

export interface ResolvedLinkPreview {
  messageType: string
  fallbackText: string
  payload: Record<string, unknown>
}

export async function fetchConversations(
  token: string | null,
  cursor?: string,
  size: number = 20,
): Promise<Conversation[]> {
  const params = new URLSearchParams({ size: String(size) })
  if (cursor) params.set('cursor', cursor)

  return apiRequest<Conversation[]>(`/chat/conversations?${params.toString()}`, { token, cache: false })
}

export async function fetchConversation(
  conversationId: string,
  token: string | null,
): Promise<Conversation> {
  return apiRequest<Conversation>(
    `/chat/conversations/${encodeURIComponent(conversationId)}`,
    { token, cache: false },
  )
}

export async function startConversation(
  targetUserId: string,
  token: string | null,
): Promise<Conversation> {
  return apiRequest<Conversation>('/chat/conversations', {
    method: 'POST',
    token,
    body: { targetUserId },
  })
}

export async function acceptConversationRequest(
  conversationId: string,
  token: string | null,
): Promise<Conversation> {
  return apiRequest<Conversation>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/accept`,
    { method: 'POST', token },
  )
}

export async function denyConversationRequest(
  conversationId: string,
  token: string | null,
): Promise<void> {
  return apiRequest<void>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/request`,
    { method: 'DELETE', token },
  )
}

export async function setConversationMute(
  conversationId: string,
  until: string | null,
  token: string | null,
): Promise<Conversation> {
  return apiRequest<Conversation>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/mute`,
    { method: 'PUT', token, body: { until } },
  )
}

export async function fetchMessages(
  conversationId: string,
  page: number,
  size: number,
  token: string | null,
): Promise<Message[]> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  return apiRequest<Message[]>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`,
    { token, cache: false },
  )
}

export async function fetchPins(
  conversationId: string,
  token: string | null,
): Promise<Message[]> {
  return apiRequest<Message[]>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/pins`,
    { token, cache: false },
  )
}

export async function searchMessages(
  conversationId: string,
  query: string,
  token: string | null,
): Promise<Message[]> {
  const params = new URLSearchParams({ q: query, limit: '50' })
  return apiRequest<Message[]>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/messages/search?${params.toString()}`,
    { token, cache: false },
  )
}

export async function postMessage(
  conversationId: string,
  content: string,
  token: string | null,
  options?: {
    messageType?: string
    payload?: Record<string, unknown> | null
    replyToId?: string | null
    mediaUrl?: string | null
  },
): Promise<Message> {
  return apiRequest<Message>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      token,
      body: {
        content,
        messageType: options?.messageType,
        payload: options?.payload ?? undefined,
        replyToId: options?.replyToId ?? undefined,
        mediaUrl: options?.mediaUrl ?? undefined,
      },
    },
  )
}

export async function resolveLinkPreview(
  url: string,
  token: string | null,
): Promise<ResolvedLinkPreview> {
  const params = new URLSearchParams({ url })
  return apiRequest<ResolvedLinkPreview>(
    `/chat/link-preview?${params.toString()}`,
    { token, cache: false },
  )
}

export async function markRead(
  conversationId: string,
  token: string | null,
): Promise<void> {
  return apiRequest<void>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'PUT', token },
  )
}

export async function searchUsers(
  query: string,
  token: string | null,
  limit: number = 10,
): Promise<BackendUser[]> {
  if (!query.trim() || query.trim().length < 2) {
    return []
  }

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  })
  return apiRequest<BackendUser[]>(`/users/search?${params.toString()}`, { token, cache: false })
}

export async function fetchPublicKey(
  username: string,
  token: string | null,
): Promise<string | null> {
  try {
    const data = await apiRequest<{ publicKey?: string | null }>(
      `/chat/keys/${encodeURIComponent(username)}`,
      { token },
    )
    return data.publicKey ?? null
  } catch {
    return null
  }
}

export async function uploadPublicKey(
  publicKey: string,
  token: string | null,
): Promise<void> {
  return apiRequest<void>('/chat/keys/me', {
    method: 'PUT',
    token,
    body: { publicKey },
  })
}
