export interface Community {
  id: string
  name: string
  tagline: string
  members: number
  color: string
  icon: string
  isLive: boolean
  bannerUrl?: string
  iconUrl?: string
  iconEmoji?: string
  iconType?: string
}
