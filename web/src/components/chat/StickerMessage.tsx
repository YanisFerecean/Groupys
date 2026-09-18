"use client";

import { StickerPayload } from "@/types/chat";
import { safeHttpUrl } from "@/lib/mediaUrl";

/** Large borderless sticker from the server catalog (the backend validates ids and URLs). */
export function StickerMessage({ payload }: { payload: StickerPayload }) {
  const src = safeHttpUrl(payload.url);
  if (!src) {
    return <p className="text-[13px] italic text-on-surface-variant">Sticker unavailable</p>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={payload.name ? `${payload.name} sticker` : "Sticker"}
      title={payload.name}
      width={160}
      height={160}
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      className="w-40 h-40 object-contain select-none"
    />
  );
}
