"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizonal } from "lucide-react";
import { chatWs } from "@/lib/ws";

interface MessageInputProps {
  conversationId: string;
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ conversationId, onSend, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [content]);

  const stopTyping = () => {
    if (isTyping) {
      chatWs.send({ type: "TYPING_STOP", conversationId });
      setIsTyping(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Typing indicator logic
    if (!isTyping) {
      chatWs.send({ type: "TYPING_START", conversationId });
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };

  const MAX_LENGTH = 2000;
  const remaining = MAX_LENGTH - content.length;
  const nearLimit = remaining <= 200;

  const handleSend = () => {
    if (!content.trim() || disabled || content.length > MAX_LENGTH) return;
    
    stopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    onSend(content.trim());
    setContent("");
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-surface border-t border-surface-container-high">
      <div className="flex items-end gap-2 max-w-4xl mx-auto align-bottom">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            disabled={disabled}
            rows={1}
            maxLength={MAX_LENGTH}
            className={`w-full max-h-[120px] min-h-[44px] bg-surface-container resize-none rounded-2xl px-4 py-3 text-[15px] text-on-surface focus:outline-none focus:ring-2 placeholder:text-on-surface-variant disabled:opacity-50 transition-all custom-scrollbar ${
              remaining < 0 ? "focus:ring-error/40 ring-2 ring-error/30" : "focus:ring-primary/20"
            }`}
          />
          {nearLimit && (
            <span className={`absolute right-3 bottom-2 text-[11px] tabular-nums pointer-events-none ${
              remaining <= 0 ? "text-error font-medium" : "text-on-surface-variant"
            }`}>
              {remaining}
            </span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled || remaining < 0}
          className="h-[44px] w-[44px] rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          <SendHorizonal className="w-5 h-5 ml-0.5" />
        </button>
      </div>
    </div>
  );
}
