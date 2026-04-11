"use client";

import { useState, useEffect } from "react";
import type { CommunityRes } from "@/lib/api";
import { fetchCommunitiesByGenre, fetchCommunitiesByArtist } from "@/lib/api";

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
  selectedArtists: { id: string; name: string }[];
  selectedCommunityIds: Set<string>;
  onToggle: (communityId: string) => void;
  token: string | null;
}

export default function CommunityStep({
  selectedGenres,
  selectedArtists,
  selectedCommunityIds,
  onToggle,
  token,
}: CommunityStepProps) {
  type State =
    | { status: "loading" }
    | { status: "idle" }
    | { status: "error"; message: string }
    | { status: "done"; communities: CommunityRes[] };

  const [state, setState] = useState<State>(() =>
    !token || (selectedGenres.length === 0 && selectedArtists.length === 0)
      ? { status: "idle" }
      : { status: "loading" }
  );

  useEffect(() => {
    if (!token || (selectedGenres.length === 0 && selectedArtists.length === 0)) return;

    Promise.allSettled([
      ...selectedGenres.map((g) => fetchCommunitiesByGenre(g, token)),
      ...selectedArtists.map((a) => fetchCommunitiesByArtist(a.id, token)),
    ]).then((results) => {
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
      setState({ status: "done", communities: deduped });
    }).catch(() => {
      setState({ status: "error", message: "Failed to load communities." });
    });
  }, [selectedGenres, selectedArtists, token]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          Find your people
        </h2>
        <p className="text-on-surface-variant text-sm">
          Communities matched to your taste — join freely, leave anytime.
        </p>
      </div>

      {state.status === "loading" && (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface-container-high rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-error text-center py-6">{state.message}</p>
      )}

      {(state.status === "idle" || (state.status === "done" && state.communities.length === 0)) && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant/40">
          <span className="material-symbols-outlined" style={{ fontSize: 48 }}>
            group_off
          </span>
          <p className="text-sm font-medium text-center">
            No communities found for your genres yet — check back soon!
          </p>
        </div>
      )}

      {state.status === "done" && state.communities.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-0.5">
          {state.communities.map((community) => {
            const isSelected = selectedCommunityIds.has(community.id);
            const color = communityColor(community.id);

            return (
              <button
                key={community.id}
                onClick={() => onToggle(community.id)}
                className={`relative overflow-hidden rounded-2xl text-left transition-all duration-200 h-24 p-3.5 flex flex-col justify-between ${
                  isSelected ? "ring-2 ring-white/80 ring-offset-1 ring-offset-transparent scale-[0.97]" : "hover:scale-[0.97]"
                }`}
                style={{ backgroundColor: color }}
              >
                {/* Decorative background icon */}
                <span
                  className="material-symbols-outlined absolute -bottom-2 -right-2 text-white/10 select-none pointer-events-none"
                  style={{ fontSize: 64, fontVariationSettings: "'FILL' 1" }}
                >
                  music_note
                </span>

                {/* Top row: name + checkmark */}
                <div className="flex items-start justify-between gap-2 relative">
                  <h4 className="text-sm font-extrabold text-white leading-tight line-clamp-2">
                    {community.name}
                  </h4>
                  {isSelected && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-on-surface"
                        style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}
                      >
                        check
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom row: members + genre tag */}
                <div className="relative flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-white/60" style={{ fontSize: 12 }}>
                    group
                  </span>
                  <span className="text-[10px] font-semibold text-white/60">
                    {formatMembers(community.memberCount)}
                  </span>
                  {community.genre && (
                    <span className="ml-auto bg-black/20 text-white/90 px-1.5 py-px rounded-full text-[9px] font-bold tracking-wider uppercase">
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
        <p className="text-xs text-primary font-semibold text-center">
          {selectedCommunityIds.size} communit{selectedCommunityIds.size !== 1 ? "ies" : "y"} selected
        </p>
      )}
    </div>
  );
}
