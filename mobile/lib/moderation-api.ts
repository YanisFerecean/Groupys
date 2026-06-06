import { apiRequest } from '@/lib/apiRequest'

export type ReportTargetType = 'USER' | 'MESSAGE' | 'POST' | 'COMMUNITY'

export type ReportReason =
  | 'HARASSMENT'
  | 'SPAM'
  | 'INAPPROPRIATE_CONTENT'
  | 'IMPERSONATION'
  | 'OTHER'

/** User-facing labels for the report reason categories (App Store guideline 1.2). */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'OTHER', label: 'Other' },
]

export interface BlockedUser {
  userId: string
  username: string
  displayName: string | null
  profileImage: string | null
  blockedAt: string
}

export interface ReportPayload {
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  details?: string
}

/** Block a user: backend unmatches, deletes the conversation, and hides them everywhere. */
export async function blockUser(targetUserId: string, token: string | null): Promise<void> {
  return apiRequest<void>(
    `/users/${encodeURIComponent(targetUserId)}/block`,
    { method: 'POST', token },
  )
}

export async function unblockUser(targetUserId: string, token: string | null): Promise<void> {
  return apiRequest<void>(
    `/users/${encodeURIComponent(targetUserId)}/block`,
    { method: 'DELETE', token },
  )
}

export async function fetchBlockedUsers(token: string | null): Promise<BlockedUser[]> {
  return apiRequest<BlockedUser[]>('/users/me/blocks', { token, cache: false })
}

/** File a report against a user, message, post, or community for admin review. */
export async function reportContent(payload: ReportPayload, token: string | null): Promise<void> {
  return apiRequest<void>('/reports', { method: 'POST', token, body: payload })
}
