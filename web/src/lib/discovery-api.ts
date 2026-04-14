import type { DiscoveredPost, SuggestedCommunity } from "@/types/discovery";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export async function followUser(
  targetUserId: string,
  token: string | null,
): Promise<void> {
  const res = await fetch(`${API_URL}/users/${targetUserId}/follow`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to follow user");
}

export async function fetchDiscoveredPosts(
  token: string | null,
  limit = 10
): Promise<DiscoveredPost[]> {
  const res = await fetch(
    `${API_URL}/discovery/posts/suggested?limit=${limit}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSuggestedCommunities(
  token: string | null,
  limit = 4,
  refresh = false
): Promise<SuggestedCommunity[]> {
  const res = await fetch(
    `${API_URL}/discovery/communities/suggested?limit=${limit}&refresh=${refresh}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) throw new Error("Failed to fetch suggested communities");
  return res.json();
}
