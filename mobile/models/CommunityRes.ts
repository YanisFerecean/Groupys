export interface CommunityResDto {
  id: string
  name: string
  description: string
  genre: string
  country: string
  countryCode?: string | null
  imageUrl: string
  bannerUrl?: string
  iconType?: string
  iconEmoji?: string
  iconUrl?: string
  tags: string[]
  artistId: number | null
  memberCount: number
  createdById: string
  createdAt: string
  visibility?: string
  discoveryEnabled?: boolean
  lastProfileRefreshAt?: string | null
  tasteSummaryText?: string | null
}
