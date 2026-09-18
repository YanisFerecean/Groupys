"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import dynamic from "next/dynamic";
import { SendHorizonal, Smile, Check, X, Plus, Sticker } from "lucide-react";
import { chatWs } from "@/lib/ws";
import { Message } from "@/types/chat";
import { messagePreview } from "@/lib/messagePreview";
import type { StickerCatalogItem } from "@/lib/chat-api";

const EmojiPicker = dynamic(() => import("./EmojiPicker"), { ssr: false });
const StickerPicker = dynamic(() => import("./StickerPicker").then((m) => ({ default: m.StickerPicker })), {
  ssr: false,
});

/** An entry in the composer's "+" attachment menu (photo, voice, music, …). */
export interface AttachmentAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface MessageInputProps {
  conversationId: string;
  onSend: (content: string) => void;
  disabled?: boolean;
  rateLimitError?: boolean;
  /** Items shown in the "+" attachment menu. */
  attachments?: AttachmentAction[];
  /** Message currently being replied to (shows a reply bar). */
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  /** Message currently being edited (switches composer to edit mode). */
  editing?: Message | null;
  onSubmitEdit?: (content: string) => void;
  onCancelEdit?: () => void;
  /** Sends a catalog sticker (shows the sticker button when provided). */
  onSendSticker?: (sticker: StickerCatalogItem) => void;
}

const MAX_LENGTH = 2000;

export function MessageInput({
  conversationId,
  onSend,
  disabled,
  rateLimitError,
  attachments,
  replyingTo,
  onCancelReply,
  editing,
  onSubmitEdit,
  onCancelEdit,
  onSendSticker,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const isEditing = !!editing;
  const showAttach = !!attachments?.length && !isEditing;
  const showSticker = !!onSendSticker && !isEditing;

  // Seed the editor with the message text when an edit begins (render-phase state
  // adjustment — the recommended alternative to setState-in-effect).
  const [prevEditId, setPrevEditId] = useState<string | null>(editing?.id ?? null);
  if ((editing?.id ?? null) !== prevEditId) {
    setPrevEditId(editing?.id ?? null);
    setContent(editing?.content ?? "");
  }

  // Move the caret to the end and focus when an edit begins (DOM side effect only).
  useEffect(() => {
    if (!editing) return;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    });
  }, [editing]);

  // Close popovers on outside click.
  useEffect(() => {
    if (!emojiOpen && !attachOpen && !stickerOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (emojiOpen && emojiRef.current && !emojiRef.current.contains(target)) setEmojiOpen(false);
      if (attachOpen && attachRef.current && !attachRef.current.contains(target)) setAttachOpen(false);
      if (stickerOpen && stickerRef.current && !stickerRef.current.contains(target)) setStickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiOpen, attachOpen, stickerOpen]);

  // Make sure a pending typing indicator is withdrawn if the composer unmounts mid-typing.
  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    },
    []
  );

  const insertEmoji = useCallback((emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + emoji);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + emoji + el.value.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.selectionStart = start + emoji.length;
      el.selectionEnd = start + emoji.length;
      el.focus();
    });
  }, []);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [content]);

  const stopTyping = useCallback(() => {
    if (isTyping) {
      chatWs.send({ type: "TYPING_STOP", conversationId });
      setIsTyping(false);
    }
  }, [isTyping, conversationId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Typing indicators only apply to composing new messages, not editing.
    if (isEditing) return;

    if (!e.target.value.trim()) {
      stopTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    if (!isTyping) {
      chatWs.send({ type: "TYPING_START", conversationId });
      setIsTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };

  const remaining = MAX_LENGTH - content.length;
  const nearLimit = remaining <= 200;

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled || content.length > MAX_LENGTH) return;

    if (isEditing) {
      onSubmitEdit?.(trimmed);
      setContent("");
      resetTextareaHeight();
      return;
    }

    stopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSend(trimmed);
    setContent("");
    resetTextareaHeight();
  };

  const cancelEdit = () => {
    setContent("");
    onCancelEdit?.();
    resetTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape") {
      if (isEditing) cancelEdit();
      else if (replyingTo) onCancelReply?.();
    }
  };

  return (
    <div className="p-4 bg-surface border-t border-surface-container-high">
      {rateLimitError && (
        <p className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium mb-2">
          Slow down! You&apos;re sending messages too fast.
        </p>
      )}

      {/* Edit / reply context bar */}
      {(isEditing || replyingTo) && (
        <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2 rounded-xl bg-surface-container border-l-2 border-primary px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-primary">
              {isEditing ? "Editing message" : `Replying to ${replyingTo?.senderDisplayName || replyingTo?.senderUsername}`}
            </p>
            <p className="text-[12px] text-on-surface-variant truncate">
              {isEditing ? editing?.content : replyingTo ? messagePreview(replyingTo) : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={isEditing ? cancelEdit : onCancelReply}
            className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        {showAttach && (
          <div ref={attachRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAttachOpen((o) => !o)}
              disabled={disabled}
              className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
                attachOpen
                  ? "bg-primary/15 text-primary"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
              title="Attach"
            >
              <Plus className={`w-5 h-5 transition-transform ${attachOpen ? "rotate-45" : ""}`} />
            </button>
            {attachOpen && (
              <div className="absolute bottom-full left-0 mb-2 min-w-48 rounded-2xl bg-surface-container-high border border-surface-container-highest shadow-lg py-1.5 z-20">
                {attachments!.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => {
                      setAttachOpen(false);
                      a.onClick();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[14px] text-on-surface hover:bg-surface-container-highest transition-colors"
                  >
                    <span className="text-on-surface-variant">{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div
          className={`flex-1 relative flex items-center bg-surface-container rounded-full px-4 py-1 gap-1 transition-all ${
            remaining < 0 ? "ring-2 ring-error/30" : "focus-within:ring-2 focus-within:ring-primary/20"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={isEditing ? "Edit your message..." : "Message..."}
            disabled={disabled}
            rows={1}
            maxLength={MAX_LENGTH}
            className="flex-1 max-h-30 min-h-11 bg-transparent resize-none text-[15px] text-on-surface focus:outline-none placeholder:text-on-surface-variant disabled:opacity-50 custom-scrollbar py-2.5"
          />
          {nearLimit && (
            <span
              className={`text-[11px] tabular-nums pointer-events-none flex-shrink-0 ${
                remaining <= 0 ? "text-error font-medium" : "text-on-surface-variant"
              }`}
            >
              {remaining}
            </span>
          )}
          {showSticker && (
            <div ref={stickerRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStickerOpen((o) => !o);
                  setEmojiOpen(false);
                }}
                disabled={disabled}
                title="Stickers"
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  stickerOpen ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Sticker className="w-5 h-5" />
              </button>
              {stickerOpen && (
                <StickerPicker
                  onSelect={(s) => {
                    setStickerOpen(false);
                    onSendSticker?.(s);
                  }}
                />
              )}
            </div>
          )}
          <div ref={emojiRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setEmojiOpen((o) => !o);
                setStickerOpen(false);
              }}
              disabled={disabled}
              title="Emoji"
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                emojiOpen ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>
            {emojiOpen && <EmojiPicker onSelectAction={insertEmoji} />}
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled || remaining < 0}
          className="h-11 w-11 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          title={isEditing ? "Save edit" : "Send"}
        >
          {isEditing ? <Check className="w-5 h-5" /> : <SendHorizonal className="w-5 h-5 ml-0.5" />}
        </button>
      </div>
    </div>
  );
}
