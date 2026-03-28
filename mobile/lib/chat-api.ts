import type { BackendUser } from '@/lib/api'
import { API_URL } from '@/lib/api'
import type { Conversation, Message } from '@/models/Chat'

type JsonRequestInit = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function chatRequest(
  path: string,
  token: string | null,
  init: JsonRequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const { body, ...rest } = init
  const requestInit: RequestInit = {
    ...rest,
    headers,
  }

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    requestInit.body = JSON.stringify(body)
  }

  return fetch(`${API_URL}${path}`, requestInit)
}

export async function fetchConversations(
  token: string | null,
  cursor?: string,
  size: number = 20,
): Promise<Conversation[]> {
  const params = new URLSearchParams({ size: String(size) })
  if (cursor) params.set('cursor', cursor)

  const res = await chatRequest(`/chat/conversations?${params.toString()}`, token)
  if (!res.ok) throw new Error('Failed to fetch conversations')
  return res.json()
}

export async function fetchConversation(
  conversationId: string,
  token: string | null,
): Promise<Conversation> {
  const res = await chatRequest(`/chat/conversations/${encodeURIComponent(conversationId)}`, token)
  if (!res.ok) throw new Error('Failed to fetch conversation')
  return res.json()
}

export async function startConversation(
  targetUserId: string,
  token: string | null,
): Promise<Conversation> {
  const res = await chatRequest('/chat/conversations', token, {
    method: 'POST',
    body: { targetUserId },
  })
  if (!res.ok) throw new Error('Failed to start conversation')
  return res.json()
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
  const res = await chatRequest(
    `/chat/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`,
    token,
  )
  if (!res.ok) throw new Error('Failed to fetch messages')
  return res.json()
}

export async function postMessage(
  conversationId: string,
  content: string,
  token: string | null,
): Promise<Message> {
  const res = await chatRequest(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, token, {
    method: 'POST',
    body: { content },
  })
  if (!res.ok) throw new Error('Failed to send message')
  return res.json()
}

export async function markRead(
  conversationId: string,
  token: string | null,
): Promise<void> {
  const res = await chatRequest(`/chat/conversations/${encodeURIComponent(conversationId)}/read`, token, {
    method: 'PUT',
  })
  if (!res.ok) throw new Error('Failed to mark conversation read')
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
  const res = await chatRequest(`/users/search?${params.toString()}`, token)
  if (!res.ok) throw new Error('Failed to search users')
  return res.json()
}

export async function fetchPublicKey(
  username: string,
  token: string | null,
): Promise<string | null> {
  try {
    const res = await chatRequest(`/chat/keys/${encodeURIComponent(username)}`, token)
    if (!res.ok) return null
    const data = await res.json() as { publicKey?: string | null }
    return data.publicKey ?? null
  } catch {
    return null
  }
}

export async function uploadPublicKey(
  publicKey: string,
  token: string | null,
): Promise<void> {
  const res = await chatRequest('/chat/keys/me', token, {
    method: 'PUT',
    body: { publicKey },
  })
  if (!res.ok) throw new Error('Failed to upload public key')
}
