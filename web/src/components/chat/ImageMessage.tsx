"use client";

import { useState } from "react";
import { Message } from "@/types/chat";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import MediaLightbox from "@/components/ui/MediaLightbox";

/** Renders an IMAGE message as a thumbnail that opens a full-screen lightbox. */
export function ImageMessage({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const src = resolveMediaUrl(message.mediaUrl);

  if (!src) {
    return <p className="text-[13px] italic text-on-surface-variant">Photo unavailable</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container hover:opacity-95 transition-opacity"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Shared photo"
          className="max-w-[260px] max-h-[340px] object-cover block"
          loading="lazy"
        />
      </button>
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
