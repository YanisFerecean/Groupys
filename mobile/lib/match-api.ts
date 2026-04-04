import { apiRequest } from '@/lib/apiRequest'
import type { SentLike, UserMatch } from '@/models/Match'

export async function fetchMatches(token: string | null): Promise<UserMatch[]> {
  return apiRequest<UserMatch[]>('/matches', { token, cache: false })
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
  return apiRequest<UserMatch[]>(`/matches/history?${params.toString()}`, { token, cache: false })
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
  return apiRequest<SentLike[]>(`/matches/sent-likes?${params.toString()}`, { token, cache: false })
}

export async function fetchMatch(matchId: string, token: string | null): Promise<UserMatch> {
  return apiRequest<UserMatch>(`/matches/${encodeURIComponent(matchId)}`, { token, cache: false })
}

export async function unmatchUser(matchId: string, token: string | null): Promise<void> {
  return apiRequest<void>(`/matches/${encodeURIComponent(matchId)}`, { method: 'DELETE', token })
}

export async function withdrawLike(targetUserId: string, token: string | null): Promise<void> {
  return apiRequest<void>(
    `/discovery/users/${encodeURIComponent(targetUserId)}/like`,
    { method: 'DELETE', token },
  )
}
