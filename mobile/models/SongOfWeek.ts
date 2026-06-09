import type { TrackPayload } from '@/models/ChatPayloads'

export interface SongOfWeekCandidate {
  id: string
  track: TrackPayload
  voteCount: number
  votedByMe: boolean
  submittedByUserId: string
}

export interface SongOfWeekPoll {
  id: string
  communityId: string
  weekStart: string
  endsAt: string
  candidates: SongOfWeekCandidate[]
  pinnedWinner: SongOfWeekCandidate | null
  recap: string | null
}
