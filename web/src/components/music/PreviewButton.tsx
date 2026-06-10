"use client";

import { Pause, Play } from "lucide-react";
import { usePreviewPlayer } from "@/hooks/usePreviewPlayer";

interface PreviewButtonProps {
  trackId: string;
  previewUrl?: string;
  className?: string;
  iconClassName?: string;
}

/** Play/pause toggle for a 30s track preview. Renders nothing without a preview URL. */
export function PreviewButton({ trackId, previewUrl, className, iconClassName }: PreviewButtonProps) {
  const { play, isPlaying } = usePreviewPlayer();
  if (!previewUrl) return null;
  const playing = isPlaying(trackId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        play(trackId, previewUrl);
      }}
      title={playing ? "Pause preview" : "Play 30s preview"}
      className={
        className ??
        "h-9 w-9 rounded-full flex items-center justify-center bg-primary text-on-primary shadow hover:opacity-90 transition-opacity"
      }
    >
      {playing ? (
        <Pause className={iconClassName ?? "w-4 h-4"} />
      ) : (
        <Play className={`${iconClassName ?? "w-4 h-4"} ml-0.5`} />
      )}
    </button>
  );
}
