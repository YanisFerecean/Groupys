"use client";

import { Music, Pause, Play } from "lucide-react";
import { MediaMusicAttachment } from "@/types/chat";
import { usePreviewPlayer } from "@/hooks/usePreviewPlayer";
import { safeHttpUrl } from "@/lib/mediaUrl";

interface MediaMusicOverlayProps {
  music: MediaMusicAttachment;
  containerWidth: number;
  containerHeight: number;
}

const OVERLAY_WIDTH = 190;

/**
 * The story-style music pill drawn over a received photo/video, positioned by the sender's
 * normalized coordinates. The mobile app plays the exact 30s window of the full song via Apple
 * Music; the web can only play the free 30s preview, so the pill plays that when available and
 * otherwise stays informational.
 */
export function MediaMusicOverlay({ music, containerWidth, containerHeight }: MediaMusicOverlayProps) {
  const { track, style, lyric } = music;
  const preview = usePreviewPlayer();
  const trackId = `media:${track.id || track.title}`;
  const previewUrl = safeHttpUrl(track.previewUrl);
  const playing = preview.isPlaying(trackId);
  const progress =
    playing && preview.durationSec > 0 ? Math.min(1, preview.positionSec / preview.durationSec) : 0;

  const maxWidth = Math.max(80, containerWidth - 16);
  const left = Math.min(Math.max(0, music.position.x * containerWidth), Math.max(0, containerWidth - 48));
  const top = Math.min(Math.max(0, music.position.y * containerHeight), Math.max(0, containerHeight - 40));
  const artwork = safeHttpUrl(track.artworkUrl);
  const subtitle = track.artist || track.album;

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (previewUrl) preview.play(trackId, previewUrl);
  };

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left, top, width: style === "lyric" ? "auto" : OVERLAY_WIDTH, maxWidth }}
    >
      {style === "lyric" && lyric ? (
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-black/60 backdrop-blur px-3.5 py-2.5 text-white">
          <Music className="w-4 h-4 shrink-0" />
          <p className="text-[14px] font-bold leading-snug line-clamp-3">{lyric}</p>
          {previewUrl && (
            <button
              type="button"
              onClick={toggle}
              title={playing ? "Pause preview" : "Play 30s preview"}
              className="ml-1 h-7 w-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          )}
        </div>
      ) : (
        <div
          className={`pointer-events-auto flex items-center gap-2.5 bg-black/60 backdrop-blur text-white ${
            style === "sticker" ? "rounded-2xl p-2" : "rounded-full p-1.5 pr-2"
          }`}
        >
          {artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artwork}
              alt=""
              referrerPolicy="no-referrer"
              className={`object-cover shrink-0 ${style === "sticker" ? "w-12 h-12 rounded-xl" : "w-9 h-9 rounded-full"}`}
            />
          ) : (
            <div
              className={`bg-primary flex items-center justify-center shrink-0 ${
                style === "sticker" ? "w-12 h-12 rounded-xl" : "w-9 h-9 rounded-full"
              }`}
            >
              <Music className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold truncate">{track.title}</p>
            {subtitle && <p className="text-[11px] text-white/75 truncate">{subtitle}</p>}
          </div>
          {previewUrl && (
            <button
              type="button"
              onClick={toggle}
              title={playing ? "Pause preview" : "Play 30s preview"}
              className="h-7 w-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          )}
        </div>
      )}
      {progress > 0 && (
        <div className="mt-1 mx-2 h-[3px] rounded-full bg-white/25 overflow-hidden">
          <div className="h-full bg-white" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
