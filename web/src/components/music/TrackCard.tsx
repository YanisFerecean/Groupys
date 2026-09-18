"use client";

import { Check, ExternalLink, ListPlus } from "lucide-react";
import { TrackPayload } from "@/types/chat";
import { usePreviewPlayer } from "@/hooks/usePreviewPlayer";
import { safeHttpUrl } from "@/lib/mediaUrl";
import { MusicCardArtwork } from "./MusicCardArtwork";
import { PreviewButton } from "./PreviewButton";

interface TrackCardProps {
  track: TrackPayload;
  /** Optional eyebrow label shown above the title (e.g. "Dedication"). */
  label?: string;
  /** Adds the track to the conversation's collaborative playlist (shown when provided). */
  onAddToPlaylist?: () => void;
  /** Whether the track is already in the collaborative playlist. */
  inPlaylist?: boolean;
}

/** Apple Music deep link, falling back to a catalog search when the payload carries none. */
function appleMusicLink(track: TrackPayload): string {
  const explicit = safeHttpUrl(track.appleMusicUrl);
  if (explicit) return explicit;
  return `https://music.apple.com/search?term=${encodeURIComponent(`${track.title} ${track.artist ?? ""}`.trim())}`;
}

/** A shared-song card with artwork, 30s preview, add-to-playlist and an "open in Apple Music" link. */
export function TrackCard({ track, label, onAddToPlaylist, inPlaylist }: TrackCardProps) {
  const { isPlaying, positionSec, durationSec } = usePreviewPlayer();
  const active = isPlaying(track.id);
  const progress = active && durationSec ? Math.min(1, positionSec / durationSec) : 0;

  return (
    <div className="rounded-2xl bg-surface-container-high border border-surface-container-highest p-2.5 pr-3 w-[280px] max-w-full">
      <div className="flex items-center gap-3">
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

        <a
          href={appleMusicLink(track)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Open in Apple Music"
          className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {onAddToPlaylist && (
        <button
          type="button"
          onClick={inPlaylist ? undefined : onAddToPlaylist}
          disabled={inPlaylist}
          className={`mt-2 w-full flex items-center justify-center gap-1.5 rounded-full py-1.5 text-[12px] font-semibold transition-colors ${
            inPlaylist
              ? "bg-surface-container text-on-surface-variant cursor-default"
              : "bg-primary/10 text-primary hover:bg-primary/15"
          }`}
        >
          {inPlaylist ? <Check className="w-3.5 h-3.5" /> : <ListPlus className="w-3.5 h-3.5" />}
          {inPlaylist ? "Already in the playlist" : "Add to playlist"}
        </button>
      )}
    </div>
  );
}
