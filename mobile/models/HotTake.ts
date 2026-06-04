export interface HotTakeRes {
  id: string
  question: string
  weekLabel: string
  answerType: string // FREETEXT | ARTIST | ALBUM | SONG | COMMUNITY | USER
  answerCount: number
  createdAt: string
}

export interface HotTakeAnswerRes {
  id: string
  userId: string
  username: string
  displayName: string | null
  profileImage: string | null
  answers: string[]
  imageUrls: (string | null)[]
  musicTypes: (string | null)[]
  showOnWidget: boolean
  answeredAt: string
}
