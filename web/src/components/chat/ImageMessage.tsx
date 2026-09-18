"use client";

import { useState } from "react";
import { Message, isMediaMusicAttachment, payloadNumber } from "@/types/chat";
import { fitMediaSize, resolveMediaUrl } from "@/lib/mediaUrl";
import MediaLightbox from "@/components/ui/MediaLightbox";
import { MediaMusicOverlay } from "./MediaMusicOverlay";

/**
 * Renders an IMAGE message at its true aspect ratio (from the send-time payload, or measured
 * on load for legacy messages), with any attached music overlay. Click opens a lightbox.
 */
export function ImageMessage({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  const src = resolveMediaUrl(message.mediaUrl);

  if (!src) {
    return <p className="text-[13px] italic text-on-surface-variant">Photo unavailable</p>;
  }

  const width = payloadNumber(message.payload, "width") ?? measured?.width;
  const height = payloadNumber(message.payload, "height") ?? measured?.height;
  const size = fitMediaSize(width, height, 1);
  const music = isMediaMusicAttachment(message.payload?.music) ? message.payload.music : null;

  return (
    <>
      <div className="relative" style={{ width: size.width, height: size.height }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full h-full overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container hover:opacity-95 transition-opacity"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Shared photo"
            width={size.width}
            height={size.height}
            className="w-full h-full object-cover block"
            loading="lazy"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (!payloadNumber(message.payload, "width") && img.naturalWidth && img.naturalHeight) {
                setMeasured({ width: img.naturalWidth, height: img.naturalHeight });
              }
            }}
          />
        </button>
        {music && <MediaMusicOverlay music={music} containerWidth={size.width} containerHeight={size.height} />}
      </div>
      {open && (
        <MediaLightbox
          items={[{ src, type: "image" }]}
          index={0}
          onClose={() => setOpen(false)}
          onNav={() => {}}
        />
      )}
    </>
  );
}
