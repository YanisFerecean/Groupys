"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface CommunityRes {
  id: string;
  name: string;
  genre: string | null;
  country: string | null;
  memberCount: number;
  tags: string[];
}

const COLORS = [
  "from-violet-500 to-purple-700",
  "from-pink-500 to-rose-700",
  "from-cyan-500 to-teal-700",
  "from-amber-500 to-orange-700",
  "from-emerald-500 to-green-700",
  "from-indigo-500 to-blue-700",
];

function colorFromId(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

export default function FeedSidebar() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [communities, setCommunities] = useState<CommunityRes[]>([]);
  const [trending, setTrending] = useState<CommunityRes[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const [mineRes, trendingRes] = await Promise.all([
          fetch(`${API_URL}/communities/mine`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/communities/trending?limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (mineRes.ok && !cancelled) setCommunities(await mineRes.json());
        if (trendingRes.ok && !cancelled) setTrending(await trendingRes.json());
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const visible = expanded ? communities : communities.slice(0, 3);

  return (
    <aside className="hidden xl:flex w-80 h-[calc(100vh-5rem)] sticky top-20 border-l border-surface-container-highest px-8 py-12 flex-col gap-12 overflow-y-auto">
      {/* Trending */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/60 mb-6">
          Trending Now
        </h4>
        {trending.length === 0 ? (
          <p className="text-xs text-on-surface-variant/50">No trending communities this week.</p>
        ) : (
          <div className="space-y-6">
            {trending.map((c, i) => (
              <button
                key={c.id}
                onClick={() => router.push(`/discover/community/${c.id}`)}
                className="flex items-center gap-4 group w-full text-left"
              >
                <span className="text-2xl font-black text-surface-container-highest group-hover:text-primary transition-colors shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-none mb-1 truncate group-hover:text-primary transition-colors">
                    {c.name}
                  </p>
                  <p className="text-xs text-on-surface-variant/60 truncate">
                    {[c.genre, c.country].filter(Boolean).join(" · ") || `${c.memberCount} members`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Your Communities */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/60 mb-6">
          Your Communities
        </h4>
        {communities.length === 0 ? (
          <p className="text-xs text-on-surface-variant/50">
            You haven&apos;t joined any communities yet.
          </p>
        ) : (
          <>
            <div className="space-y-4">
              {visible.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/discover/community/${c.id}`)}
                  className="flex items-center gap-3 w-full text-left group"
                >
                  <div
                    className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${colorFromId(c.id)} flex items-center justify-center`}
                  >
                    <span
                      className="material-symbols-outlined text-white"
                      style={{
                        fontSize: 18,
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      group
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-none mb-1 truncate group-hover:text-primary transition-colors">
                      {c.name}
                    </p>
                    <p className="text-xs text-on-surface-variant/60">
                      {c.memberCount} member{c.memberCount !== 1 ? "s" : ""}
                      {c.country ? ` · ${c.country}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {communities.length > 3 && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="mt-4 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                {expanded
                  ? "Show less"
                  : `Show all ${communities.length} communities`}
              </button>
            )}
          </>
        )}
      </div>

    </aside>
  );
}
