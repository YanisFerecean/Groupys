import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showTime?: boolean;
  isLastInGroup?: boolean;
  onRetry?: () => void;
}

export function MessageBubble({ message, isMine, showTime = true, isLastInGroup = true, onRetry }: MessageBubbleProps) {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(message.createdAt));

  const prevStatusRef = useRef(message.status);
  useEffect(() => {
    prevStatusRef.current = message.status;
  }, [message.status]);

  const justConfirmed = prevStatusRef.current === "sending" && message.status === "sent";
  const isSending = message.status === "sending";
  const isFailed = message.status === "failed";

  const hasPendingStatus = isMine && (isSending || isFailed);
  const showFooter = showTime || hasPendingStatus;

  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-3" : "mb-0.5"}`}>

      <div className={`flex flex-col max-w-[75%] min-w-0 ${isMine ? "items-end" : "items-start"}`}>
        <motion.div
          initial={justConfirmed ? { scale: 0.95, opacity: 0.7 } : false}
          animate={
            isSending
              ? { opacity: [0.55, 0.85, 0.55], scale: 1 }
              : { scale: 1, opacity: 1 }
          }
          transition={
            isSending
              ? { repeat: Infinity, duration: 1.4, ease: "easeInOut" }
              : justConfirmed
              ? { type: "spring", stiffness: 400, damping: 20 }
              : { duration: 0.15 }
          }
          className={`px-4 py-2.5 rounded-3xl w-fit max-w-full ${
            isMine
              ? isFailed
                ? "bg-error/90 text-on-error rounded-br-sm"
                : "bg-primary text-on-primary rounded-br-sm"
              : "bg-surface-container-high text-on-surface rounded-bl-sm shadow-sm"
          }`}
        >
          <p className="whitespace-pre-wrap break-all text-[15px] leading-relaxed">
            {message.content}
          </p>
        </motion.div>

        {showFooter && (
          <div className="flex items-center mt-1 space-x-2">
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
}
