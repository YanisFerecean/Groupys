"use client";

import { X } from "lucide-react";
import { AttachmentAction } from "@/components/chat/MessageInput";

/** Grid of music sharing/game actions, opened from the composer's Music attachment. */
export function MusicAttachSheet({
  actions,
  onClose,
}: {
  actions: AttachmentAction[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-surface border border-surface-container-high shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface">Share music</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => {
                onClose();
                a.onClick();
              }}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-surface-container p-4 hover:bg-surface-container-high transition-colors"
            >
              <span className="text-primary">{a.icon}</span>
              <span className="text-[13px] font-medium text-on-surface text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
