"use client";

import { useEffect, useCallback } from "react";

export interface LightboxItem {
  src: string;
  type: "image" | "video";
}

interface Props {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onNav: (index: number) => void;
}

export default function MediaLightbox({ items, index, onClose, onNav }: Props) {
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNav(index - 1);
      if (e.key === "ArrowRight" && hasNext) onNav(index + 1);
    },
    [index, hasPrev, hasNext, onClose, onNav],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="relative flex items-center justify-center w-full h-full p-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Prev */}
        {hasPrev && (
          <button
            onClick={() => onNav(index - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        )}

        {/* Media */}
        {item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.src}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl select-none"
          />
        ) : (
          <video
            src={item.src}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-xl"
          />
        )}

        {/* Next */}
        {hasNext && (
          <button
            onClick={() => onNav(index + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        )}

        {/* Counter */}
        {items.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
            {index + 1} / {items.length}
          </div>
        )}
      </div>
    </div>
  );
}
