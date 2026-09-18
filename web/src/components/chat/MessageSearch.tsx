"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Message } from "@/types/chat";
import { searchMessages } from "@/lib/chat-api";
import { isEncrypted } from "@/lib/crypto";
import { messagePreview } from "@/lib/messagePreview";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type CryptFn = (content: string) => Promise<string>;

interface MessageSearchProps {
  conversationId: string;
  decryptFn?: CryptFn;
  onClose: () => void;
  onJump: (messageId: string) => void;
}

const dayTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Slide-down panel for full-text search within a conversation. */
export function MessageSearch({ conversationId, decryptFn, onClose, onJump }: MessageSearchProps) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(query.trim(), 350);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (debounced.length < 2) {
        if (mounted) {
          setResults([]);
          setSearched(false);
        }
        return;
      }
      setLoading(true);
      try {
        const token = await getToken();
        const found = await searchMessages(conversationId, debounced, token);
        const decrypted = decryptFn
          ? await Promise.all(
              found.map(async (m) => {
                const type = (m.messageType || "TEXT").toUpperCase();
                if (type === "TEXT" && isEncrypted(m.content)) {
                  const content = await decryptFn(m.content).catch(() => m.content);
                  return { ...m, content };
                }
                return m;
              })
            )
          : found;
        if (mounted) {
          setResults(decrypted);
          setSearched(true);
        }
      } catch (e) {
        console.error("Search failed", e);
        if (mounted) setResults([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [debounced, conversationId, getToken, decryptFn]);

  return (
    <div className="border-b border-surface-container-high bg-surface/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-2">
        <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder="Search in conversation…"
          className="flex-1 bg-transparent text-[15px] text-on-surface focus:outline-none placeholder:text-on-surface-variant"
        />
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
          title="Close search"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {(loading || results.length > 0 || (searched && !loading)) && (
        <div className="max-h-72 overflow-y-auto custom-scrollbar px-2 pb-2">
          {loading && <p className="px-3 py-3 text-sm text-on-surface-variant">Searching…</p>}
          {!loading && searched && results.length === 0 && (
            <p className="px-3 py-3 text-sm text-on-surface-variant">No messages found.</p>
          )}
          {results.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onJump(m.id);
                onClose();
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-container transition-colors"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-semibold text-on-surface truncate">
                  {m.senderDisplayName || m.senderUsername}
                </span>
                <span className="text-[10px] text-on-surface-variant shrink-0">
                  {dayTime.format(new Date(m.createdAt))}
                </span>
              </div>
              <p className="text-[13px] text-on-surface-variant truncate">{messagePreview(m)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
