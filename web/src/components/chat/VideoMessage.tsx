"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Message, isMediaMusicAttachment, payloadNumber } from "@/types/chat";
import { fitMediaSize, resolveMediaUrl } from "@/lib/mediaUrl";
import MediaLightbox from "@/components/ui/MediaLightbox";
import { MediaMusicOverlay } from "./MediaMusicOverlay";

/**
 * Renders a VIDEO message as a poster-style tile at the clip's true aspect ratio (16:9 when
 * unknown). Click opens the lightbox player. A music overlay attached in the mobile camera is
 * drawn on top; when the sender muted the clip for the snippet, the lightbox honours that.
 */
export function VideoMessage({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const src = resolveMediaUrl(message.mediaUrl);

  if (!src) {
    return <p className="text-[13px] italic text-on-surface-variant">Video unavailable</p>;
  }

  const size = fitMediaSize(
    payloadNumber(message.payload, "width"),
    payloadNumber(message.payload, "height"),
    16 / 9
  );
  const music = isMediaMusicAttachment(message.payload?.music) ? message.payload.music : null;

  return (
    <>
      <div className="relative" style={{ width: size.width, height: size.height }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Play video"
          className="group/video block w-full h-full overflow-hidden rounded-2xl border border-surface-container-high bg-black"
        >
          {/* Metadata-only preload keeps the thread light; the first frame acts as the poster. */}
          <video
            src={`${src}#t=0.001`}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover block"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-12 w-12 rounded-full bg-black/55 backdrop-blur text-white flex items-center justify-center group-hover/video:scale-105 transition-transform">
              <Play className="w-5 h-5 ml-0.5" />
            </span>
          </span>
        </button>
        {music && <MediaMusicOverlay music={music} containerWidth={size.width} containerHeight={size.height} />}
      </div>
      {open && (
        <MediaLightbox
          items={[{ src, type: "video" }]}
          index={0}
          onClose={() => setOpen(false)}
          onNav={() => {}}
        />
      )}
    </>
  );
}
