"use client";

import { X, Heart } from "lucide-react";

interface Props {
  onPass: () => void;
  onLike: () => void;
  disabled?: boolean;
}

export default function ActionButtons({ onPass, onLike, disabled }: Props) {
  return (
    <div className="flex items-center gap-10">
      <button
        onClick={onPass}
        disabled={disabled}
        className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center shadow-md hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Pass"
      >
        <X className="w-7 h-7 text-on-surface-variant" />
      </button>
      <button
        onClick={onLike}
        disabled={disabled}
        className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center shadow-md hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Like"
      >
        <Heart className="w-7 h-7 text-primary" />
      </button>
    </div>
  );
}
