"use client";

import { useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { Message } from "@/types/chat";
import { messagePreview } from "@/lib/messagePreview";

interface PinnedMessageBarProps {
  pins: Message[];
  onJump: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

/** Sticky bar under the chat header showing pinned messages; click cycles/jumps. */
export function PinnedMessageBar({ pins, onJump, onUnpin }: PinnedMessageBarProps) {
  const [cursor, setCursor] = useState(0);
  if (pins.length === 0) return null;

  const idx = cursor % pins.length;
  const pin = pins[idx];

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-container/70 backdrop-blur border-b border-surface-container-high">
      <Pin className="w-4 h-4 text-primary shrink-0" />
      <button
        type="button"
        onClick={() => {
          onJump(pin.id);
          if (pins.length > 1) setCursor((c) => c + 1);
        }}
        className="flex-1 min-w-0 text-left"
      >
        <span className="text-[11px] font-semibold text-primary">
          Pinned{pins.length > 1 ? ` ${idx + 1}/${pins.length}` : ""}
        </span>
        <p className="truncate text-[12px] text-on-surface-variant">{messagePreview(pin)}</p>
      </button>
      {onUnpin && (
        <button
          type="button"
          onClick={() => onUnpin(pin.id)}
          title="Unpin"
          className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high shrink-0"
        >
          <PinOff className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
