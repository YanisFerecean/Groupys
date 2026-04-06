import { API_URL } from '@/lib/config'

const MEDIA_PATH_PREFIX = /^\/api\/posts\/media\//

/**
 * Normalizes any media reference into an absolute, auth-compatible URL.
 *
 * Handles:
 *  - Already-absolute URLs (https://…) → returned as-is
 *  - Relative API paths (/api/posts/media/some/key) → prefix-stripped, rebuilt
 *  - Raw object keys, including nested keys with slashes (uploads/img.jpg) → built
 *  - Null / undefined / empty → returns null
 */
export function normalizeMediaUrl(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Already absolute
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw

  // Strip the legacy /api/posts/media/ prefix if present, then rebuild
  const key = raw.replace(MEDIA_PATH_PREFIX, '')

  return `${API_URL}/posts/media/${key}`
}

/**
 * Converts a relative URL (like /api/posts/media/{key}) to an absolute URL.
 * Used for community banner/icon URLs that come as server-relative paths.
 */
export function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  const baseHost = API_URL.replace(/\/api\/?$/, '')
  return `${baseHost}${url}`
}
