/**
 * Translates incoming universal-link / custom-scheme URLs into internal Expo Router paths.
 *
 * The public web URLs (e.g. `https://groupys.app/discover/post/<id>`, `/profile/<username>`) don't
 * map 1:1 to the app's file routes — Expo Router strips `(group)` segments, and profiles are routed
 * by userId internally while share links carry a username. We land everything on the `(feed)` tab so
 * resolution is unambiguous. Kept pure (no network/auth) and defensive.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path, 'https://groupys.app')
    const segs = url.pathname.split('/').filter(Boolean)

    // Posts: /discover/post/{id} or /post/{id}
    if (segs[0] === 'discover' && segs[1] === 'post' && segs[2]) {
      return `/(home)/(feed)/post/${segs[2]}`
    }
    if (segs[0] === 'post' && segs[1]) {
      return `/(home)/(feed)/post/${segs[1]}`
    }

    // Profiles (by username): /profile/{username}, /discover/user/{username}, or /u/{username}
    if (segs[0] === 'profile' && segs[1]) {
      return `/(home)/(feed)/u/${segs[1]}`
    }
    if (segs[0] === 'discover' && segs[1] === 'user' && segs[2]) {
      return `/(home)/(feed)/u/${segs[2]}`
    }
    if (segs[0] === 'u' && segs[1]) {
      return `/(home)/(feed)/u/${segs[1]}`
    }

    return path
  } catch {
    return path
  }
}
