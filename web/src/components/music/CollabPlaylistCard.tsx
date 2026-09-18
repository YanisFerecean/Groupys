"use client";

import { ListMusic } from "lucide-react";
import { CollabPlaylistPayload } from "@/types/chat";
import { PlaylistCard } from "./PlaylistCard";

/**
 * A conversation's shared, server-maintained playlist. Tracks are added from any song card's
 * "Add to playlist" button; the footer opens the full list (view / remove songs).
 */
export function CollabPlaylistCard({
  payload,
  onOpen,
}: {
  payload: CollabPlaylistPayload;
  onOpen?: () => void;
}) {
  return (
    <PlaylistCard
      title={payload.title}
      curator={payload.curator}
      artworkUrl={payload.artworkUrl}
      trackCount={payload.trackCount}
      previews={payload.previews}
      label="Collaborative playlist"
      footer={
        onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-full bg-primary/10 text-primary py-1.5 text-[13px] font-semibold hover:bg-primary/15 transition-colors"
          >
            <ListMusic className="w-4 h-4" />
            View added songs
          </button>
        )
      }
    />
  );
}
