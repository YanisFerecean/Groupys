"use client";

import { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { PlaylistPreviewTrack } from "@/types/chat";
import { MusicCardArtwork } from "./MusicCardArtwork";
import { PreviewButton } from "./PreviewButton";

interface PlaylistCardProps {
  title: string;
  curator?: string;
  artworkUrl?: string;
  trackCount?: number;
  appleMusicUrl?: string;
  previews?: PlaylistPreviewTrack[];
  label?: string;
  /** Extra controls rendered below the card (e.g. collab "add a track"). */
  footer?: ReactNode;
}

/** Shared/collaborative playlist card with cover, meta and preview snippets. */
export function PlaylistCard({
  title,
  curator,
  artworkUrl,
  trackCount,
  appleMusicUrl,
  previews,
  label = "Playlist",
  footer,
}: PlaylistCardProps) {
  const snippets = (previews ?? []).slice(0, 3);

  return (
    <div className="rounded-2xl bg-surface-container-high border border-surface-container-highest p-2.5 w-[290px] max-w-full">
      <div className="flex items-center gap-3">
        <MusicCardArtwork url={artworkUrl} alt={title} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{label}</p>
          <p className="font-semibold text-[14px] text-on-surface truncate">{title}</p>
          <p className="text-[12px] text-on-surface-variant truncate">
            {curator ? curator : ""}
            {curator && trackCount ? " · " : ""}
            {trackCount ? `${trackCount} tracks` : ""}
          </p>
        </div>
        {appleMusicUrl && (
          <a
            href={appleMusicUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Apple Music"
            className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {snippets.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {snippets.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg bg-surface-container px-2 py-1">
              <PreviewButton
                trackId={t.id}
                previewUrl={t.previewUrl}
                className="h-6 w-6 rounded-full flex items-center justify-center bg-primary text-on-primary shrink-0"
                iconClassName="w-3 h-3"
              />
              <span className="text-[12px] text-on-surface truncate">{t.title}</span>
            </div>
          ))}
        </div>
      )}

      {footer}
    </div>
  );
}
