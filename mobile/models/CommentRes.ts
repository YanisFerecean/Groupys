export interface CommentResDto {
  id: string
  content: string
  postId: string
  parentCommentId: string | null
  authorId: string
  authorUsername: string
  authorDisplayName: string
  authorProfileImage: string
  createdAt: string
  likeCount: number
  dislikeCount: number
  userReaction: 'like' | 'dislike' | null
  replies: CommentResDto[]
}
