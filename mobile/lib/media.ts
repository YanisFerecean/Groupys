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

/** Display size for a chat media bubble, fit to the media's true ratio within a bounded box. */
export interface MediaDisplaySize {
  width: number
  height: number
  aspectRatio: number
}

const MEDIA_MAX_W = 240
const MEDIA_MAX_H = 320

/**
 * Fits natural media dimensions into a bounded box (≈240×320) preserving aspect ratio — so 16:9,
 * 4:3, and portrait media all render at their true shape with no crop and no letterbox. Falls back
 * to `fallbackRatio` (width/height) when natural dimensions are unknown (e.g. legacy messages).
 */
export function fitMediaSize(
  width: number | null | undefined,
  height: number | null | undefined,
  fallbackRatio = 1,
): MediaDisplaySize {
  const ratio = width && height && width > 0 && height > 0 ? width / height : fallbackRatio
  let displayW = MEDIA_MAX_W
  let displayH = MEDIA_MAX_W / ratio
  if (displayH > MEDIA_MAX_H) {
    displayH = MEDIA_MAX_H
    displayW = MEDIA_MAX_H * ratio
  }
  return { width: Math.round(displayW), height: Math.round(displayH), aspectRatio: ratio }
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
