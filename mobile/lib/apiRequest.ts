import { API_URL } from '@/lib/api'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: string
  token: string | null
  body?: unknown
  cache?: boolean
  headers?: Record<string, string>
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions,
): Promise<T> {
  const { method = 'GET', token, body, cache = true, headers: extra } = options

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (!cache) {
    headers['Cache-Control'] = 'no-cache, no-store'
    headers['Pragma'] = 'no-cache'
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') message = data.message
      else if (typeof data?.error === 'string') message = data.error
      else if (typeof data?.detail === 'string') message = data.detail
      else if (typeof data?.title === 'string') message = data.title
    } catch {
      // use statusText
    }
    throw new ApiError(res.status, `API error ${res.status}: ${message}`)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }

  return res.json() as Promise<T>
}
