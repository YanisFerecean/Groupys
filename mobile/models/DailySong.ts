import type { TrackPayload } from '@/models/ChatPayloads'

/** A user's ephemeral daily-song status (ticket 5.2). */
export interface DailySong {
  userId: string
  username: string
  displayName: string | null
  profileImage: string | null
  track: Omit<TrackPayload, 'type'>
  createdAt: string
  expiresAt: string
}
