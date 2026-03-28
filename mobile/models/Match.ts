export interface UserMatch {
  matchId: string
  otherUserId: string
  otherUsername: string
  otherDisplayName: string | null
  otherProfileImage: string | null
  conversationId: string | null
  status: 'ACTIVE' | 'UNMATCHED' | 'USER_A_HIDDEN' | 'USER_B_HIDDEN'
  matchedAt: string
  unreadCount: number
}

export interface LikeResponse {
  isMatch: boolean
  matchId: string | null
  conversationId: string | null
}

export interface SentLike {
  targetUserId: string
  targetUsername: string
  targetDisplayName: string | null
  targetProfileImage: string | null
  likedAt: string
}
