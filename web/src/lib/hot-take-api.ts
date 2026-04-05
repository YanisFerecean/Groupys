const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export interface HotTakeRes {
  id: string;
  question: string;
  weekLabel: string;
  answerType: string; // FREETEXT | ARTIST | ALBUM | SONG | COMMUNITY | USER
  answerCount: number;
  createdAt: string;
}

export interface HotTakeAnswerRes {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  answers: string[];
  imageUrls: (string | null)[];
  musicTypes: (string | null)[];
  showOnWidget: boolean;
  answeredAt: string;
}

function authHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchCurrentHotTake(): Promise<HotTakeRes | null> {
  const res = await fetch(`${API_URL}/hot-takes/current`);
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch hot take (${res.status})`);
  return res.json();
}

export async function fetchMyHotTakeAnswer(token: string | null): Promise<HotTakeAnswerRes | null> {
  if (!token) return null;
  const res = await fetch(`${API_URL}/hot-takes/current/my-answer`, {
    headers: authHeaders(token),
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch your answer (${res.status})`);
  return res.json();
}

export async function fetchUserHotTakeAnswer(
  username: string,
  token: string | null,
): Promise<HotTakeAnswerRes | null> {
  const res = await fetch(
    `${API_URL}/hot-takes/current/user/${encodeURIComponent(username)}`,
    { headers: authHeaders(token) },
  );
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch answer (${res.status})`);
  return res.json();
}

export async function fetchFriendsHotTakeAnswers(
  token: string | null,
): Promise<HotTakeAnswerRes[]> {
  if (!token) return [];
  const res = await fetch(`${API_URL}/hot-takes/current/friends-answers`, {
    headers: authHeaders(token),
  });
  if (res.status === 403 || res.status === 204 || res.status === 404) return [];
  if (!res.ok) return [];
  return res.json();
}

export async function submitHotTakeAnswer(
  hotTakeId: string,
  answers: string[],
  imageUrls: (string | null)[],
  musicTypes: (string | null)[],
  showOnWidget: boolean,
  token: string | null,
): Promise<HotTakeAnswerRes> {
  const res = await fetch(`${API_URL}/hot-takes/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ hotTakeId, answers, imageUrls, musicTypes, showOnWidget }),
  });
  if (!res.ok) throw new Error(`Failed to submit answer (${res.status})`);
  return res.json();
}
