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
