export interface PostResDto {
  id: string
  content: string
  media: { url: string; type: string; order: number }[]
  communityId: string
  communityName: string
  authorId: string
  authorUsername: string
  authorDisplayName: string
  authorProfileImage: string
  authorClerkId: string
  createdAt: string
  likeCount: number
  dislikeCount: number
  userReaction: 'like' | 'dislike' | null
  commentCount: number
  title?: string
}
