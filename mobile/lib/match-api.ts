import { API_URL } from '@/lib/api'
import type { SentLike, UserMatch } from '@/models/Match'

type JsonRequestInit = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function matchRequest(
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

export async function fetchMatches(token: string | null): Promise<UserMatch[]> {
  const res = await matchRequest('/matches', token)
  if (!res.ok) throw new Error('Failed to fetch matches')
  return res.json()
}

export async function fetchMatchHistory(
  token: string | null,
  page: number,
  size: number = 20,
): Promise<UserMatch[]> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  const res = await matchRequest(`/matches/history?${params.toString()}`, token)
  if (!res.ok) throw new Error('Failed to fetch match history')
  return res.json()
}

export async function fetchSentLikes(
  token: string | null,
  page: number,
  size: number = 20,
): Promise<SentLike[]> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  const res = await matchRequest(`/matches/sent-likes?${params.toString()}`, token)
  if (!res.ok) throw new Error('Failed to fetch sent likes')
  return res.json()
}

export async function fetchMatch(matchId: string, token: string | null): Promise<UserMatch> {
  const res = await matchRequest(`/matches/${encodeURIComponent(matchId)}`, token)
  if (!res.ok) throw new Error('Failed to fetch match')
  return res.json()
}

export async function unmatchUser(matchId: string, token: string | null): Promise<void> {
  const res = await matchRequest(`/matches/${encodeURIComponent(matchId)}`, token, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to unmatch')
}

export async function withdrawLike(targetUserId: string, token: string | null): Promise<void> {
  const res = await matchRequest(`/discovery/users/${encodeURIComponent(targetUserId)}/like`, token, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to withdraw like')
}
