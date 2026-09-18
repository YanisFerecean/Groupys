"use client";

import { TrackPayload } from "@/types/chat";
import { PreviewButton } from "./PreviewButton";

/** Compact chip for a track reaction: artwork-less pill with title and inline preview. */
export function TrackReactionChip({ track }: { track: TrackPayload }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-tertiary/15 text-tertiary pl-1 pr-2.5 py-0.5 max-w-[190px]">
      {track.previewUrl ? (
        <PreviewButton
          trackId={track.id}
          previewUrl={track.previewUrl}
          className="h-5 w-5 rounded-full flex items-center justify-center bg-tertiary text-white shrink-0"
          iconClassName="w-3 h-3"
        />
      ) : (
        <span className="text-[12px] pl-1">🎵</span>
      )}
      <span className="text-[12px] truncate">{track.title}</span>
    </span>
  );
}
