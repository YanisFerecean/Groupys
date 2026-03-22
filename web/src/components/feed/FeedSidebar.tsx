"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface CommunityRes {
  id: string;
  name: string;
  country: string;
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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/communities/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          setCommunities(await res.json());
        }
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
        <div className="space-y-6">
          {[
            { rank: "01", name: "Neon Waves", tag: "Synthwave · Berlin" },
            { rank: "02", name: "Jazz Heads", tag: "Jazz · New York" },
            { rank: "03", name: "Sahara Sounds", tag: "Afrobeats · Lagos" },
          ].map((item) => (
            <div
              key={item.rank}
              className="flex items-center gap-4 group cursor-pointer"
            >
              <span className="text-2xl font-black text-surface-container-highest group-hover:text-primary transition-colors">
                {item.rank}
              </span>
              <div>
                <p className="text-sm font-bold leading-none mb-1">
                  {item.name}
                </p>
                <p className="text-xs text-on-surface-variant/60">
                  {item.tag}
                </p>
              </div>
            </div>
          ))}
        </div>
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

      {/* Promo Card */}
      <div className="relative rounded-3xl overflow-hidden aspect-[4/5] bg-primary group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/40 opacity-60 mix-blend-overlay transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute bottom-0 left-0 p-6 text-on-primary">
          <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">
            Live Session
          </span>
          <h5 className="text-2xl font-black leading-tight mb-2">
            Groupys Studio Sessions: NYC
          </h5>
          <p className="text-sm opacity-90 font-medium">
            Join the waitlist for the exclusive rooftop vinyl night.
          </p>
        </div>
      </div>
    </aside>
  );
}
