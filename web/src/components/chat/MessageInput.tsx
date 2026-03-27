"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizonal, Smile } from "lucide-react";
import { chatWs } from "@/lib/ws";

// ── Emoji picker ──────────────────────────────────────────────────────────────

const EMOJI_GROUPS = [
  { label: "Smileys", emojis: ["😀","😁","😂","🤣","😃","😄","😅","😆","😇","😉","😊","🙂","🙃","😋","😌","😍","🥰","😘","😗","😙","😚","😜","🤪","😝","😛","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","😮","🤯","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿"] },
  { label: "People", emojis: ["👋","🤚","🖐","✋","🖖","👌","🤌","✌","🤞","🤟","🤘","👈","👉","👆","👇","☝","👍","👎","✊","👊","🤛","🤜","👏","🙌","🤲","🤝","🙏","💪","🦾","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","👀","👁","👅","👄"] },
  { label: "Animals", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🦭","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦙","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🕊","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿","🦔"] },
  { label: "Food", emojis: ["🍎","🍊","🍋","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🧄","🧅","🥔","🍠","🥐","🥖","🍞","🥨","🥯","🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🧋","☕","🍵","🫖","🍺","🍻","🥂","🍷","🥃","🍹","🧉","🍾"] },
  { label: "Travel", emojis: ["🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍","🛵","🚲","🛴","🛺","🚍","🚘","🚖","✈","🛫","🛬","🛩","💺","🚀","🛸","🚁","🛶","⛵","🚤","🛥","🛳","⛴","🚢","🏄","🚣","🤽","🏊","🧗","🚵","🏇","🚴","🏋","🤸","🤼","🤺","⛷","🏂","🪂","🏌","🏄","🤾","🏸","🏒","🏑","🥍","🏓","🏸","🥊","🥋","🎽","🛹","🛼","🛷","⛸","🥅","⛳","🎯","🎱","🎰","🎲"] },
  { label: "Objects", emojis: ["❤","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣","💕","💞","💓","💗","💖","💘","💝","✨","⭐","🌟","💫","⚡","🔥","💥","🎉","🎊","🎈","🎁","🎀","🏆","🥇","🥈","🥉","🎖","🏅","🎗","🎫","🎟","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎵","🎶","🎹","🥁","🪘","🎷","🎺","🎸","🪕","🎻","🎮","🕹","🎯","🎱","🎳","🎰","🧩","🪆","🪅","🎭","🖼","🧸","🪀","🪁","🏮","🧨","🎑","🎐","🧧"] },
];

function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [activeGroup, setActiveGroup] = useState(0);

  return (
    <div className="absolute bottom-full mb-2 right-0 w-72 bg-surface-container border border-white/80 rounded-2xl shadow-lg overflow-hidden z-50">
      {/* Group tabs */}
      <div className="flex border-b border-surface-container-high overflow-x-auto no-scrollbar">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setActiveGroup(i)}
            className={`shrink-0 px-3 py-2 text-[11px] font-semibold transition-colors ${
              activeGroup === i
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto custom-scrollbar">
        {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="text-xl leading-none p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

interface MessageInputProps {
  conversationId: string;
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ conversationId, onSend, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Close picker on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiOpen]);

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + emoji);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    // Restore cursor after the inserted emoji
    requestAnimationFrame(() => {
      el.selectionStart = start + emoji.length;
      el.selectionEnd = start + emoji.length;
      el.focus();
    });
  };

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
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
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
        <div ref={emojiRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            disabled={disabled}
            className={`h-[44px] w-[44px] rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              emojiOpen
                ? "bg-primary/15 text-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>
          {emojiOpen && <EmojiPicker onSelect={insertEmoji} />}
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
