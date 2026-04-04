"use client";

import { useState, useEffect } from "react";
import type { CommunityRes } from "@/lib/api";
import { fetchCommunitiesByGenre } from "@/lib/api";

const PALETTE = ["#7c3aed", "#be185d", "#0891b2", "#b45309", "#065f46", "#1e3a5f"];

function communityColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function formatMembers(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(count);
}

interface CommunityStepProps {
  selectedGenres: string[];
  selectedCommunityIds: Set<string>;
  onToggle: (communityId: string) => void;
  token: string | null;
}

export default function CommunityStep({
  selectedGenres,
  selectedCommunityIds,
  onToggle,
  token,
}: CommunityStepProps) {
  const [communities, setCommunities] = useState<CommunityRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || selectedGenres.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.allSettled(
      selectedGenres.map((g) => fetchCommunitiesByGenre(g, token)),
    ).then((results) => {
      const seen = new Set<string>();
      const deduped: CommunityRes[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") {
          for (const c of r.value) {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              deduped.push(c);
            }
          }
        }
      }
      setCommunities(deduped);
      setLoading(false);
    }).catch(() => {
      setError("Failed to load communities.");
      setLoading(false);
    });
  }, [selectedGenres, token]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          Your communities are waiting
        </h2>
        <p className="text-on-surface-variant text-sm">
          Based on your taste — join the ones that feel right. You can always find more later.
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[100px] bg-surface-container-high rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-error text-center py-6">{error}</p>
      )}

      {!loading && !error && communities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant/40">
          <span className="material-symbols-outlined" style={{ fontSize: 48 }}>
            group_off
          </span>
          <p className="text-sm font-medium text-center">
            No communities found for your genres yet — check back soon!
          </p>
        </div>
      )}

      {!loading && communities.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {communities.map((community) => {
            const isSelected = selectedCommunityIds.has(community.id);
            const color = communityColor(community.id);

            return (
              <button
                key={community.id}
                onClick={() => onToggle(community.id)}
                className={`relative overflow-hidden rounded-2xl text-left transition-all duration-200 min-h-[100px] p-4 flex flex-col justify-between ${
                  isSelected ? "ring-2 ring-white ring-offset-2 scale-[0.98]" : "hover:scale-[0.98]"
                }`}
                style={{ backgroundColor: color }}
              >
                {/* Decorative icon */}
                <span
                  className="material-symbols-outlined absolute -top-2 -right-2 text-white/10 select-none pointer-events-none"
                  style={{ fontSize: 72, fontVariationSettings: "'FILL' 1" }}
                >
                  {community.iconEmoji ? "music_note" : "group"}
                </span>

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-on-surface"
                      style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  </div>
                )}

                <div className="relative space-y-1">
                  <h4 className="text-base font-extrabold text-white leading-tight">
                    {community.name}
                  </h4>
                  {community.description && (
                    <p className="text-[11px] text-white/70 font-medium line-clamp-1">
                      {community.description}
                    </p>
                  )}
                </div>

                <div className="relative flex items-center gap-1.5 mt-2">
                  <span
                    className="material-symbols-outlined text-white/70"
                    style={{ fontSize: 13 }}
                  >
                    group
                  </span>
                  <span className="text-[11px] font-semibold text-white/70">
                    {formatMembers(community.memberCount)} members
                  </span>
                  {community.genre && (
                    <span className="ml-auto bg-white/20 text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase">
                      {community.genre}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedCommunityIds.size > 0 && (
        <p className="text-xs text-on-surface-variant text-center">
          {selectedCommunityIds.size} communit{selectedCommunityIds.size !== 1 ? "ies" : "y"} selected
        </p>
      )}
    </div>
  );
}
