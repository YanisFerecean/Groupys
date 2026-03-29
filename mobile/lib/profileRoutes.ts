export const HOME_TABS = ['(feed)', '(discover)', '(match)', '(profile)'] as const

export type HomeTab = (typeof HOME_TABS)[number]

export function isHomeTab(value?: string): value is HomeTab {
  return HOME_TABS.includes(value as HomeTab)
}

export function resolveHomeTab(segments: readonly string[], fallback: HomeTab = '(feed)'): HomeTab {
  return isHomeTab(segments[1]) ? segments[1] : fallback
}

export function homeTabRootPath(tab: HomeTab) {
  return `/(home)/${tab}`
}

export function getAdjacentHomeTab(tab: HomeTab, direction: 'previous' | 'next') {
  const index = HOME_TABS.indexOf(tab)

  if (index === -1) return null

  const targetIndex = direction === 'previous' ? index - 1 : index + 1

  return HOME_TABS[targetIndex] ?? null
}

export function publicProfilePath(userId: string, tab: HomeTab = '(profile)') {
  return `/(home)/${tab}/user/${encodeURIComponent(userId)}`
}

export function communityBasePath(tab: HomeTab) {
  return `/(home)/${tab}/community`
}

export function communityDetailPath(communityId: string, tab: HomeTab) {
  return `${communityBasePath(tab)}/${encodeURIComponent(communityId)}`
}

export function postBasePath(tab: HomeTab) {
  return `/(home)/${tab}/post`
}

export function postDetailPath(postId: string, tab: HomeTab) {
  return `${postBasePath(tab)}/${encodeURIComponent(postId)}`
}
