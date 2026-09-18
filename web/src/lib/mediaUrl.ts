const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/**
 * Resolves a stored media reference to an absolute, auth-compatible URL.
 * Backend upload responses return server-relative paths like
 * `/api/posts/media/{key}`; absolute URLs are passed through unchanged.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_URL}${url.replace(/^\/api/, "")}`;
}

/** Display size for a chat media bubble, fit to the media's true ratio within a bounded box. */
export interface MediaDisplaySize {
  width: number;
  height: number;
  aspectRatio: number;
}

const MEDIA_MAX_W = 280;
const MEDIA_MAX_H = 360;

/**
 * Fits natural media dimensions into a bounded box (≈280×360) preserving aspect ratio, so
 * landscape, square and portrait media all render at their true shape with no crop. Falls back
 * to `fallbackRatio` (width/height) when the natural size is unknown (legacy messages).
 * Mirrors the mobile app's `fitMediaSize`.
 */
export function fitMediaSize(
  width: number | null | undefined,
  height: number | null | undefined,
  fallbackRatio = 1
): MediaDisplaySize {
  const ratio = width && height && width > 0 && height > 0 ? width / height : fallbackRatio;
  let displayW = MEDIA_MAX_W;
  let displayH = MEDIA_MAX_W / ratio;
  if (displayH > MEDIA_MAX_H) {
    displayH = MEDIA_MAX_H;
    displayW = MEDIA_MAX_H * ratio;
  }
  return { width: Math.round(displayW), height: Math.round(displayH), aspectRatio: ratio };
}

/**
 * Only http(s) URLs are safe to hand to `<a href>` / `<img src>` from untrusted payloads —
 * anything else (javascript:, data:, …) is dropped.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
