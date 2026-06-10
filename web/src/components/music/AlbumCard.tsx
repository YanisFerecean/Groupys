"use client";

import { ExternalLink } from "lucide-react";
import { AlbumPayload } from "@/types/chat";
import { MusicCardArtwork } from "./MusicCardArtwork";

/** A shared-album card: cover, title, artist and track count. */
export function AlbumCard({ album }: { album: AlbumPayload }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-container-high border border-surface-container-highest p-2.5 pr-3 w-[280px] max-w-full">
      <MusicCardArtwork url={album.artworkUrl} alt={album.title} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Album</p>
        <p className="font-semibold text-[14px] text-on-surface truncate">{album.title}</p>
        <p className="text-[12px] text-on-surface-variant truncate">
          {album.artist}
          {album.trackCount ? ` · ${album.trackCount} tracks` : ""}
        </p>
      </div>
      {album.appleMusicUrl && (
        <a
          href={album.appleMusicUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Apple Music"
          className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
