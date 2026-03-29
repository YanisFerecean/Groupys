const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export type FriendStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED";

export interface FriendRes {
  friendshipId: string;
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  status: "PENDING" | "ACCEPTED";
}

export interface FriendStatusRes {
  status: FriendStatus;
  friendshipId: string | null;
}

function auth(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchFriendStatus(
  targetUserId: string,
  token: string | null,
): Promise<FriendStatusRes> {
  const res = await fetch(`${API_URL}/friends/status/${targetUserId}`, {
    headers: auth(token),
  });
  if (!res.ok) throw new Error("Failed to fetch friend status");
  return res.json();
}

export async function sendFriendRequest(
  targetUserId: string,
  token: string | null,
): Promise<FriendRes> {
  const res = await fetch(`${API_URL}/friends/request/${targetUserId}`, {
    method: "POST",
    headers: auth(token),
  });
  if (!res.ok) throw new Error("Failed to send friend request");
  return res.json();
}

export async function acceptFriendRequest(
  friendshipId: string,
  token: string | null,
): Promise<FriendRes> {
  const res = await fetch(`${API_URL}/friends/accept/${friendshipId}`, {
    method: "POST",
    headers: auth(token),
  });
  if (!res.ok) throw new Error("Failed to accept friend request");
  return res.json();
}

export async function declineOrCancelRequest(
  friendshipId: string,
  token: string | null,
): Promise<void> {
  const res = await fetch(`${API_URL}/friends/request/${friendshipId}`, {
    method: "DELETE",
    headers: auth(token),
  });
  if (!res.ok) throw new Error("Failed to decline/cancel request");
}

export async function removeFriend(
  otherUserId: string,
  token: string | null,
): Promise<void> {
  const res = await fetch(`${API_URL}/friends/${otherUserId}`, {
    method: "DELETE",
    headers: auth(token),
  });
  if (!res.ok) throw new Error("Failed to remove friend");
}

export async function fetchFriends(token: string | null): Promise<FriendRes[]> {
  const res = await fetch(`${API_URL}/friends`, { headers: auth(token) });
  if (!res.ok) throw new Error("Failed to fetch friends");
  return res.json();
}

export async function fetchReceivedRequests(
  token: string | null,
): Promise<FriendRes[]> {
  const res = await fetch(`${API_URL}/friends/requests/received`, {
    headers: auth(token),
  });
  if (!res.ok) throw new Error("Failed to fetch received requests");
  return res.json();
}

export async function fetchSentRequests(
  token: string | null,
): Promise<FriendRes[]> {
  const res = await fetch(`${API_URL}/friends/requests/sent`, {
    headers: auth(token),
  });
  if (!res.ok) throw new Error("Failed to fetch sent requests");
  return res.json();
}
