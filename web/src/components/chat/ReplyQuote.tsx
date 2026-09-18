import { ReplyStub } from "@/types/chat";
import { messagePreview } from "@/lib/messagePreview";

interface ReplyQuoteProps {
  reply: ReplyStub;
  /** Tone the quote to sit on a coloured (sent) bubble vs a neutral surface. */
  onColored?: boolean;
  onClick?: () => void;
}

/**
 * A quoted preview of the message being replied to — shown above a reply bubble
 * and inside the composer's reply bar. Mirrors the mobile reply affordance.
 */
export function ReplyQuote({ reply, onColored, onClick }: ReplyQuoteProps) {
  const name = reply.senderDisplayName || reply.senderUsername;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col items-start gap-0.5 w-full text-left rounded-lg border-l-2 pl-2 pr-2 py-1 mb-1 min-w-0 ${
        onColored
          ? "border-on-primary/60 bg-on-primary/10"
          : "border-primary/60 bg-surface-container"
      } ${onClick ? "hover:opacity-90 cursor-pointer" : "cursor-default"}`}
    >
      <span className={`text-[11px] font-semibold truncate max-w-full ${onColored ? "text-on-primary/90" : "text-primary"}`}>
        {name}
      </span>
      <span className={`text-[12px] truncate max-w-full ${onColored ? "text-on-primary/75" : "text-on-surface-variant"}`}>
        {messagePreview(reply)}
      </span>
    </button>
  );
}
