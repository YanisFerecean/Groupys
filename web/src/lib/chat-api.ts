import { Conversation, Message } from "@/types/chat";
import { BackendUser } from "./api"; // we'll reuse the existing BackendUser for search

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

type JsonRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

// Extracted from api.ts to keep it simple, but we assume
// the consumer passes the token (e.g., from Clerk's getToken())
async function apiRequest(
  path: string,
  token: string | null,
  init: JsonRequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { body, ...rest } = init;
  const requestInit: RequestInit = {
    ...rest,
    headers,
  };

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(body);
  }

  return fetch(`${API_URL}${path}`, requestInit);
}

export async function fetchConversations(token: string | null, cursor?: string, size = 20): Promise<Conversation[]> {
  const params = new URLSearchParams({ size: size.toString() });
  if (cursor) params.set("cursor", cursor);
  const res = await apiRequest(`/chat/conversations?${params}`, token);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function fetchConversation(id: string, token: string | null): Promise<Conversation> {
  const res = await apiRequest(`/chat/conversations/${encodeURIComponent(id)}`, token);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}

export async function startConversation(targetUserId: string, token: string | null): Promise<Conversation> {
  const res = await apiRequest("/chat/conversations", token, {
    method: "POST",
    body: { targetUserId },
  });
  if (!res.ok) throw new Error("Failed to start conversation");
  return res.json();
}

export async function fetchMessages(
  conversationId: string,
  page: number,
  size: number,
  token: string | null
): Promise<Message[]> {
  const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
  const res = await apiRequest(`/chat/conversations/${encodeURIComponent(conversationId)}/messages?${params}`, token);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function markRead(conversationId: string, token: string | null): Promise<void> {
  const res = await apiRequest(`/chat/conversations/${encodeURIComponent(conversationId)}/read`, token, {
    method: "PUT",
  });
  if (!res.ok) throw new Error("Failed to mark read");
}

export async function postMessage(conversationId: string, content: string, token: string | null): Promise<Message> {
  const res = await apiRequest(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, token, {
    method: "POST",
    body: { content },
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function acceptConversationRequest(conversationId: string, token: string | null): Promise<void> {
  const res = await apiRequest(`/chat/conversations/${encodeURIComponent(conversationId)}/accept`, token, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to accept conversation request");
}

export async function denyConversationRequest(conversationId: string, token: string | null): Promise<void> {
  const res = await apiRequest(`/chat/conversations/${encodeURIComponent(conversationId)}/request`, token, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to deny conversation request");
}

export async function searchUsers(query: string, token: string | null): Promise<BackendUser[]> {
  if (!query || query.length < 2) return [];
  const params = new URLSearchParams({ q: query });
  const res = await apiRequest(`/users/search?${params}`, token);
  if (!res.ok) throw new Error("Failed to search users");
  return res.json();
}

/** Fetches the ECDH public key for a user by username. Returns null if not yet set. */
export async function fetchPublicKey(username: string, token: string | null): Promise<string | null> {
  try {
    const res = await apiRequest(`/chat/keys/${encodeURIComponent(username)}`, token);
    if (!res.ok) return null;
    const data = await res.json() as { publicKey: string };
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

/** Uploads (or replaces) the current user's ECDH public key on the server. */
export async function uploadPublicKey(publicKey: string, token: string | null): Promise<void> {
  await apiRequest("/chat/keys/me", token, { method: "PUT", body: { publicKey } });
}
