const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export type ReportTargetType = "USER" | "MESSAGE" | "POST" | "COMMUNITY";

export type ReportReason =
  | "HARASSMENT"
  | "SPAM"
  | "INAPPROPRIATE_CONTENT"
  | "IMPERSONATION"
  | "OTHER";

/** User-facing labels for the report reason categories. Mirrors the mobile app. */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SPAM", label: "Spam" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "OTHER", label: "Other" },
];

export interface BlockedUser {
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  blockedAt: string;
}

export interface ReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

/** File a report against a user, message, post, or community for admin review. */
export async function reportContent(payload: ReportPayload, token: string | null): Promise<void> {
  const res = await fetch(`${API_URL}/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to submit report (${res.status})`);
  }
}

/** Block a user: backend unmatches, deletes the conversation, and hides them everywhere. */
export async function blockUser(targetUserId: string, token: string | null): Promise<void> {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(targetUserId)}/block`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Failed to block user (${res.status})`);
}

export async function unblockUser(targetUserId: string, token: string | null): Promise<void> {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(targetUserId)}/block`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Failed to unblock user (${res.status})`);
}

export async function fetchBlockedUsers(token: string | null): Promise<BlockedUser[]> {
  const res = await fetch(`${API_URL}/users/me/blocks`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Failed to fetch blocked users (${res.status})`);
  return res.json();
}
