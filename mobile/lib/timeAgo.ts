const MINUTE = 60
const HOUR = 3600
const DAY = 86400
const WEEK = 604800
const MONTH = 2592000
const YEAR = 31536000

export function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)

  if (seconds < MINUTE) return 'just now'
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m ago`
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h ago`
  if (seconds < WEEK) return `${Math.floor(seconds / DAY)}d ago`
  if (seconds < MONTH) return `${Math.floor(seconds / WEEK)}w ago`
  if (seconds < YEAR) return `${Math.floor(seconds / MONTH)}mo ago`
  return `${Math.floor(seconds / YEAR)}y ago`
}

export function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}
