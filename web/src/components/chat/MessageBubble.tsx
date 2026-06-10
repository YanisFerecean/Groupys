import { memo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { Message } from "@/types/chat";
import { renderMessageContent, MessageCardHandlers } from "./messageRenderers";
import { ReplyQuote } from "./ReplyQuote";
import { MessageReactions } from "./MessageReactions";
import { MessageActions, MessageActionHandlers } from "./MessageActions";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showTime?: boolean;
  isLastInGroup?: boolean;
  myUserId?: string;
  onRetry?: () => void;
  actions?: MessageActionHandlers;
  cardHandlers?: MessageCardHandlers;
  onJumpToReply?: (messageId: string) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isMine,
  showTime = true,
  isLastInGroup = true,
  myUserId,
  onRetry,
  actions,
  cardHandlers,
  onJumpToReply,
}: MessageBubbleProps) {
  const time = timeFormatter.format(new Date(message.createdAt));

  const [prevStatus, setPrevStatus] = useState(message.status);
  if (prevStatus !== message.status) {
    setPrevStatus(message.status);
  }

  // Deleted messages collapse to a neutral tombstone — no content, reactions or actions.
  if (message.isDeleted) {
    return (
      <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-3" : "mb-0.5"}`}>
        <div
          className={`px-4 py-2 rounded-3xl text-[13px] italic text-on-surface-variant bg-surface-container border border-surface-container-high ${
            isMine ? "rounded-br-sm" : "rounded-bl-sm"
          }`}
        >
          This message was deleted
        </div>
      </div>
    );
  }

  const justConfirmed = prevStatus === "sending" && message.status === "sent";
  const isSending = message.status === "sending";
  const isFailed = message.status === "failed";

  const hasPendingStatus = isMine && (isSending || isFailed);
  const showFooter = showTime || hasPendingStatus || (message.edited && isLastInGroup);

  const { node, bare } = renderMessageContent(message, { isMine, ...cardHandlers });

  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-3" : "mb-0.5"}`}>
      <div className={`flex flex-col max-w-[78%] min-w-0 ${isMine ? "items-end" : "items-start"}`}>
        {message.replyTo && (
          <div className="max-w-full">
            <ReplyQuote
              reply={message.replyTo}
              onColored={false}
              onClick={onJumpToReply ? () => onJumpToReply(message.replyTo!.id) : undefined}
            />
          </div>
        )}

        <div className="relative w-fit max-w-full group/bubble">
          <motion.div
            initial={justConfirmed ? { scale: 0.95, opacity: 0.7 } : false}
            animate={isSending ? { opacity: [0.55, 0.85, 0.55], scale: 1 } : { scale: 1, opacity: 1 }}
            transition={
              isSending
                ? { repeat: Infinity, duration: 1.4, ease: "easeInOut" }
                : justConfirmed
                ? { type: "spring", stiffness: 400, damping: 20 }
                : { duration: 0.15 }
            }
            className={
              bare
                ? "w-fit max-w-full"
                : `px-4 py-2.5 rounded-3xl w-fit max-w-full ${
                    isMine
                      ? isFailed
                        ? "bg-error/90 text-on-error rounded-br-sm"
                        : "bg-primary text-on-primary rounded-br-sm"
                      : "bg-surface-container-high text-on-surface rounded-bl-sm shadow-sm"
                  }`
            }
          >
            {node}
          </motion.div>

          {actions && !isSending && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100 transition-opacity ${
                isMine ? "left-0 -translate-x-[calc(100%+6px)]" : "right-0 translate-x-[calc(100%+6px)]"
              }`}
            >
              <MessageActions message={message} isMine={isMine} actions={actions} />
            </div>
          )}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <MessageReactions
            reactions={message.reactions}
            myUserId={myUserId}
            isMine={isMine}
            onToggleEmoji={actions ? (emoji) => actions.onReactEmoji(message, emoji) : undefined}
          />
        )}

        {showFooter && (
          <div className="flex items-center mt-1 space-x-2">
            {message.edited && (
              <span className="text-[10px] text-on-surface-variant italic">edited</span>
            )}
            {showTime && (
              <span className="flex items-center gap-0.5 text-[10px] text-on-surface-variant">
                {time}
                {isMine && !isSending && !isFailed && (
                  <Check className="w-3 h-3 text-on-surface-variant/70" />
                )}
              </span>
            )}
            {isMine && isSending && (
              <span className="text-[10px] text-on-surface-variant italic">Sending...</span>
            )}
            {isMine && isFailed && (
              <>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-error">
                  <AlertCircle className="w-3 h-3" />
                  Failed
                </span>
                {onRetry && (
                  <button onClick={onRetry} className="text-[11px] font-semibold text-primary underline underline-offset-2 ml-1">
                    Retry
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
