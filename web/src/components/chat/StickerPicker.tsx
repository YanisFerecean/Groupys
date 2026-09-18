"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { fetchStickers, StickerCatalogItem } from "@/lib/chat-api";
import { safeHttpUrl } from "@/lib/mediaUrl";

interface StickerPickerProps {
  onSelect: (sticker: StickerCatalogItem) => void;
}

/** Popover grid of the server sticker catalog, anchored above the composer. */
export function StickerPicker({ onSelect }: StickerPickerProps) {
  const { getToken } = useAuth();
  const [stickers, setStickers] = useState<StickerCatalogItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getToken();
        const list = await fetchStickers(token);
        if (mounted) setStickers(list);
      } catch {
        if (mounted) setFailed(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getToken]);

  return (
    <div className="absolute bottom-full right-0 mb-2 w-72 rounded-2xl bg-surface-container-high border border-surface-container-highest shadow-lg p-3 z-20">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Stickers</p>
      {failed ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">Couldn&apos;t load stickers.</p>
      ) : !stickers ? (
        <div className="grid grid-cols-4 gap-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-surface-container-highest" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto">
          {stickers.map((s) => {
            const src = safeHttpUrl(s.url);
            if (!src) return null;
            return (
              <button
                key={s.id}
                type="button"
                title={s.name}
                onClick={() => onSelect(s)}
                className="aspect-square rounded-xl flex items-center justify-center hover:bg-surface-container-highest transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={s.name} width={40} height={40} loading="lazy" draggable={false} className="w-10 h-10" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
