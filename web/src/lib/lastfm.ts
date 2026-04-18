const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export async function connectLastFm(username: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/music/lastfm/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to connect Last.FM (${res.status})`);
  }
}

export async function disconnectLastFm(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/music/lastfm/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to disconnect Last.FM (${res.status})`);
  }
}
