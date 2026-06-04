import { ApiError, apiRequest } from '@/lib/apiRequest'
import type { HotTakeRes, HotTakeAnswerRes } from '@/models/HotTake'

function isEmpty(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 204 || err.status === 404)
}

export async function fetchCurrentHotTake(): Promise<HotTakeRes | null> {
  try {
    const res = await apiRequest<HotTakeRes>('/hot-takes/current', { token: null, cache: false })
    return res ?? null
  } catch (err) {
    if (isEmpty(err)) return null
    throw err
  }
}

export async function fetchMyHotTakeAnswer(token: string | null): Promise<HotTakeAnswerRes | null> {
  if (!token) return null
  try {
    const res = await apiRequest<HotTakeAnswerRes>('/hot-takes/current/my-answer', {
      token,
      cache: false,
    })
    return res ?? null
  } catch (err) {
    if (isEmpty(err)) return null
    throw err
  }
}

export async function fetchUserHotTakeAnswer(
  username: string,
  token: string | null,
): Promise<HotTakeAnswerRes | null> {
  try {
    const res = await apiRequest<HotTakeAnswerRes>(
      `/hot-takes/current/user/${encodeURIComponent(username)}`,
      { token, cache: false },
    )
    return res ?? null
  } catch (err) {
    if (isEmpty(err)) return null
    throw err
  }
}

export async function fetchFriendsHotTakeAnswers(
  token: string | null,
): Promise<HotTakeAnswerRes[]> {
  if (!token) return []
  try {
    const res = await apiRequest<HotTakeAnswerRes[]>('/hot-takes/current/friends-answers', {
      token,
      cache: false,
    })
    return res ?? []
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 204 || err.status === 404)) {
      return []
    }
    return []
  }
}

export async function submitHotTakeAnswer(
  hotTakeId: string,
  answers: string[],
  imageUrls: (string | null)[],
  musicTypes: (string | null)[],
  showOnWidget: boolean,
  token: string | null,
): Promise<HotTakeAnswerRes> {
  return apiRequest<HotTakeAnswerRes>('/hot-takes/answer', {
    method: 'POST',
    token,
    body: { hotTakeId, answers, imageUrls, musicTypes, showOnWidget },
  })
}
