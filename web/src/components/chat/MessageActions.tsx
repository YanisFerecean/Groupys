import { useEffect, useRef, useState } from "react";
import { Copy, Music, Pin, PinOff, Reply, SmilePlus, SquarePen, Trash2 } from "lucide-react";
import { Message } from "@/types/chat";

/** Callbacks the chat surface provides for per-message actions. */
export interface MessageActionHandlers {
  onReply: (m: Message) => void;
  onReactEmoji: (m: Message, emoji: string) => void;
  onEdit: (m: Message) => void;
  onDelete: (m: Message) => void;
  onPin: (m: Message) => void;
  onCopy: (m: Message) => void;
  /** Opens the music picker to react with a song (wired with music features). */
  onTrackReact?: (m: Message) => void;
  isPinned?: (messageId: string) => boolean;
}

const QUICK_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

interface MessageActionsProps {
  message: Message;
  isMine: boolean;
  actions: MessageActionHandlers;
}

/** Floating toolbar shown on bubble hover — web analog of the mobile long-press menu. */
export function MessageActions({ message, isMine, actions }: MessageActionsProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setEmojiOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiOpen]);

  const type = (message.messageType || "TEXT").toUpperCase();
  const isText = type === "TEXT";
  const canEdit = isMine && isText;
  const canCopy = isText && !!message.content;
  const pinned = actions.isPinned?.(message.id) ?? false;

  const btn =
    "h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors";

  return (
    <div
      ref={ref}
      className={`flex items-center gap-0.5 rounded-full bg-surface-container-high border border-surface-container-highest shadow-md px-1 py-0.5 ${
        isMine ? "flex-row-reverse" : ""
      }`}
    >
      <div className="relative">
        <button type="button" className={btn} title="React" onClick={() => setEmojiOpen((o) => !o)}>
          <SmilePlus className="w-4 h-4" />
        </button>
        {emojiOpen && (
          <div
            className={`absolute bottom-full mb-1 flex items-center gap-1 rounded-full bg-surface-container-high border border-surface-container-highest shadow-lg px-2 py-1 z-20 ${
              isMine ? "right-0" : "left-0"
            }`}
          >
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className="text-lg leading-none hover:scale-125 transition-transform"
                onClick={() => {
                  actions.onReactEmoji(message, e);
                  setEmojiOpen(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {actions.onTrackReact && (
        <button type="button" className={btn} title="React with a song" onClick={() => actions.onTrackReact!(message)}>
          <Music className="w-4 h-4" />
        </button>
      )}

      <button type="button" className={btn} title="Reply" onClick={() => actions.onReply(message)}>
        <Reply className="w-4 h-4" />
      </button>

      <button type="button" className={btn} title={pinned ? "Unpin" : "Pin"} onClick={() => actions.onPin(message)}>
        {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
      </button>

      {canCopy && (
        <button type="button" className={btn} title="Copy" onClick={() => actions.onCopy(message)}>
          <Copy className="w-4 h-4" />
        </button>
      )}

      {canEdit && (
        <button type="button" className={btn} title="Edit" onClick={() => actions.onEdit(message)}>
          <SquarePen className="w-4 h-4" />
        </button>
      )}

      {isMine && (
        <button
          type="button"
          className={`${btn} hover:text-error`}
          title="Delete"
          onClick={() => actions.onDelete(message)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
