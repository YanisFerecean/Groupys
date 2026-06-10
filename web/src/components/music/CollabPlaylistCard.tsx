"use client";

import { Plus } from "lucide-react";
import { CollabPlaylistPayload } from "@/types/chat";
import { PlaylistCard } from "./PlaylistCard";

/** A conversation's shared, server-maintained playlist with an "add a track" control. */
export function CollabPlaylistCard({
  payload,
  onAdd,
}: {
  payload: CollabPlaylistPayload;
  onAdd?: () => void;
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
        onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-full bg-primary/10 text-primary py-1.5 text-[13px] font-semibold hover:bg-primary/15 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add a track
          </button>
        )
      }
    />
  );
}
