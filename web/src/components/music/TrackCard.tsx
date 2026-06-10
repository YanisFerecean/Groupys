"use client";

import { ExternalLink } from "lucide-react";
import { TrackPayload } from "@/types/chat";
import { usePreviewPlayer } from "@/hooks/usePreviewPlayer";
import { MusicCardArtwork } from "./MusicCardArtwork";
import { PreviewButton } from "./PreviewButton";

interface TrackCardProps {
  track: TrackPayload;
  /** Optional eyebrow label shown above the title (e.g. "Dedication"). */
  label?: string;
}

/** A shared-song card with artwork, 30s preview and an "open in Apple Music" link. */
export function TrackCard({ track, label }: TrackCardProps) {
  const { isPlaying, positionSec, durationSec } = usePreviewPlayer();
  const active = isPlaying(track.id);
  const progress = active && durationSec ? Math.min(1, positionSec / durationSec) : 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-container-high border border-surface-container-highest p-2.5 pr-3 w-[280px] max-w-full">
      <MusicCardArtwork url={track.artworkUrl} alt={track.title}>
        {track.previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <PreviewButton
              trackId={track.id}
              previewUrl={track.previewUrl}
              className="h-8 w-8 rounded-full flex items-center justify-center bg-white/90 text-black shadow"
            />
          </div>
        )}
      </MusicCardArtwork>

      <div className="flex-1 min-w-0">
        {label && <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{label}</p>}
        <p className="font-semibold text-[14px] text-on-surface truncate">{track.title}</p>
        <p className="text-[12px] text-on-surface-variant truncate">{track.artist}</p>
        {track.previewUrl && (
          <div className="mt-1.5 h-1 rounded-full bg-surface-container overflow-hidden">
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      {track.appleMusicUrl && (
        <a
          href={track.appleMusicUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Open in Apple Music"
          className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
