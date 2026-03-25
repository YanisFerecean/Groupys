import { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  onRetry?: () => void;
}

export function MessageBubble({ message, isMine, onRetry }: MessageBubbleProps) {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(message.createdAt));

  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"} mb-4`}>

      <div className={`flex flex-col max-w-[75%] min-w-0 ${isMine ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isMine
              ? "bg-primary text-on-primary rounded-br-sm"
              : "bg-surface-container-high text-on-surface rounded-bl-sm"
          } ${message.status === "sending" ? "opacity-70" : ""}`}
        >
          <p className="whitespace-pre-wrap break-all text-[15px] leading-relaxed">
            {message.content}
          </p>
        </div>
        
        <div className="flex items-center mt-1 space-x-2">
          <span className="text-[10px] text-on-surface-variant">{time}</span>
          {isMine && message.status === "sending" && (
            <span className="text-[10px] text-on-surface-variant italic">Sending...</span>
          )}
          {isMine && message.status === "failed" && (
            <>
              <span className="text-[10px] text-error">Failed to send</span>
              {onRetry && (
                <button onClick={onRetry} className="text-[10px] text-primary underline ml-1">
                  Retry
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
