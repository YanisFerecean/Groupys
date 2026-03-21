export interface Post {
  id: string
  title: string
  image: string
  author: string
  group: string
  timeAgo: string
  likes: number
  comments: number
  badge?: string
  description?: string
}
