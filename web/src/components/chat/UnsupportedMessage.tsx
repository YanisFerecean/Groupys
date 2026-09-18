"use client";

import { Smartphone } from "lucide-react";
import { Message } from "@/types/chat";
import { messagePreview } from "@/lib/messagePreview";

/**
 * Fallback bubble for message types the web app cannot render (a newer card type, or a
 * malformed payload). Shows the sender's fallback label so the message is never blank, plus a
 * hint that it can be viewed in the mobile app — the web analog of mobile's "update the app".
 */
export function UnsupportedMessage({ message, isMine }: { message: Message; isMine: boolean }) {
  const label = messagePreview(message);
  return (
    <div className="space-y-1">
      {label && <p className="text-[15px] leading-relaxed break-words">{label}</p>}
      <p
        className={`flex items-center gap-1 text-[11px] italic ${
          isMine ? "text-on-primary/75" : "text-on-surface-variant"
        }`}
      >
        <Smartphone className="w-3 h-3 shrink-0" />
        This message can&apos;t be displayed on web yet — open it in the Groupys app.
      </p>
    </div>
  );
}
