export interface CommunityResDto {
  id: string
  name: string
  description: string
  genre: string
  country: string
  imageUrl: string
  bannerUrl?: string
  iconType?: string
  iconEmoji?: string
  iconUrl?: string
  tags: string[]
  artistId: number
  memberCount: number
  createdById: string
  createdAt: string
}
