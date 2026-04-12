export interface SuggestedUser {
  userId: string
  username: string
  displayName: string | null
  profileImage: string | null
  score: number
  explanation: string
  reasonCodes: string[]
  matchedArtists: { id: string; name: string }[]
  matchedGenres: { id: string; name: string }[]
  sharedCommunityCount: number
  sameCountry: boolean
  mutualFollowCount: number
  bio?: string | null
  widgets?: string | null
}
