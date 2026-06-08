"use client";

import type { TopAlbum, TopArtist, TopSong } from "../types";

interface TasteRevealStepProps {
  displayName: string;
  tasteSummary: string;
  tags: string[];
  topArtists: TopArtist[];
  topSongs: TopSong[];
  topAlbums: TopAlbum[];
  onEnter: () => void;
}

export default function TasteRevealStep({
  displayName,
  tasteSummary,
  tags,
  topArtists,
  topSongs,
  topAlbums,
  onEnter,
}: TasteRevealStepProps) {
  const firstName = displayName.trim().split(/\s+/)[0] || "you";
  const counts = [
    topArtists.length && `${topArtists.length} artist${topArtists.length !== 1 ? "s" : ""}`,
    topSongs.length && `${topSongs.length} song${topSongs.length !== 1 ? "s" : ""}`,
    topAlbums.length && `${topAlbums.length} album${topAlbums.length !== 1 ? "s" : ""}`,
  ].filter(Boolean);

  return (
    <div className="text-center space-y-6 py-2">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Your taste, {firstName}</p>
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight leading-snug">
          {tasteSummary}
        </h2>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {tags.slice(0, 6).map((t) => (
            <span key={t} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold">
              {t}
            </span>
          ))}
        </div>
      )}

      {counts.length > 0 && (
        <p className="text-on-surface-variant text-sm">{counts.join(" · ")} saved to your profile.</p>
      )}

      <button
        onClick={onEnter}
        className="w-full py-3 bg-primary text-on-primary rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all"
      >
        Continue
      </button>
    </div>
  );
}
