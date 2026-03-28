import { API_URL } from '@/lib/api'
import type { UserMatch } from '@/models/Match'

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
