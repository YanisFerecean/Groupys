"use client";

import { useState } from "react";
import CommunityStep from "../CommunityStep";

interface FollowNudgeStepProps {
  tags: string[];
  seedArtists: { id: string; name: string }[];
  token: string | null;
  finishing: boolean;
  onFinish: (communityIds: string[]) => void;
}

export default function FollowNudgeStep({ tags, seedArtists, token, finishing, onFinish }: FollowNudgeStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-5">
      <CommunityStep
        selectedGenres={tags}
        selectedArtists={seedArtists}
        selectedCommunityIds={selected}
        onToggle={toggle}
        token={token}
      />

      <div className="h-px bg-outline-variant/30" />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => onFinish([])}
          disabled={finishing}
          className="px-4 py-2 rounded-full text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-all disabled:opacity-40"
        >
          Skip
        </button>
        <button
          onClick={() => onFinish([...selected])}
          disabled={finishing}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
        >
          {finishing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Finishing…
            </>
          ) : (
            <>
              Let&apos;s go
              <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
