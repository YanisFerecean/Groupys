import { Share } from 'react-native'

/**
 * Public web base used for shareable deep links. Tapping one of these on a device with the app
 * installed opens the app via universal links / the Android intent filter (see app.json and the
 * web `.well-known/` association files); otherwise it falls back to the public web page.
 */
const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://groupys.app'

export function postShareUrl(postId: string): string {
  return `${WEB_BASE_URL}/discover/post/${encodeURIComponent(postId)}`
}

export function profileShareUrl(username: string): string {
  return `${WEB_BASE_URL}/profile/${encodeURIComponent(username)}`
}

/** Opens the native share sheet for a post. No-op-safe: swallows user-dismissed/errors. */
export async function sharePost(opts: {
  postId: string
  title?: string | null
  authorName?: string | null
}): Promise<void> {
  const url = postShareUrl(opts.postId)
  const headline = opts.title?.trim()
    ? `"${opts.title.trim()}"`
    : opts.authorName
      ? `${opts.authorName}'s post`
      : 'this post'
  try {
    await Share.share({
      message: `Check out ${headline} on Groupys\n${url}`,
      url,
    })
  } catch (error) {
    // User cancelled or the sheet failed — nothing actionable.
    if (__DEV__) console.warn('sharePost failed', error)
  }
}

/** Opens the native share sheet for a profile. No-op-safe: swallows user-dismissed/errors. */
export async function shareProfile(opts: {
  username: string
  displayName?: string | null
}): Promise<void> {
  const url = profileShareUrl(opts.username)
  const name = opts.displayName?.trim() || `@${opts.username}`
  try {
    await Share.share({
      message: `Check out ${name} on Groupys\n${url}`,
      url,
    })
  } catch (error) {
    if (__DEV__) console.warn('shareProfile failed', error)
  }
}
