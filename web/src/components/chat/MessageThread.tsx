"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { Message } from "@/types/chat";
import { useUser } from "@clerk/nextjs";
import { chatWs } from "@/lib/ws";

// ── Module-scope helpers (pure, no component state) ───────────────────────────

function dayKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDay(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(ts) === dayKey(now.toISOString())) return "Today";
  if (dayKey(ts) === dayKey(yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function minuteBucket(ts: string): number {
  return Math.floor(new Date(ts).getTime() / 60000);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MessageThreadProps {
  messages: Message[];
  conversationId: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  isDecrypting?: boolean;
  onLoadMore: () => void;
  otherLastReadAt?: string | null;
  onRetry?: (msg: Message) => void;
}

export function MessageThread({ messages, conversationId, hasMore, isLoadingMore, isDecrypting, onLoadMore, otherLastReadAt, onRetry }: MessageThreadProps) {
  const { user } = useUser();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const [typists, setTypists] = useState<Map<string, string>>(new Map());

  // Listen to typing events
  useEffect(() => {
    const unsubs = [
      chatWs.on("TYPING", (payload: { conversationId: string; userId: string; username: string; isTyping: boolean }) => {
        if (payload.conversationId === conversationId && payload.username !== user?.username) {
          setTypists(prev => {
            const next = new Map(prev);
            if (payload.isTyping) {
              next.set(payload.userId, payload.username);
            } else {
              next.delete(payload.userId);
            }
            return next;
          });
        }
      })
    ];
    return () => unsubs.forEach(u => u());
  }, [conversationId, user?.id, user?.username]);

  const newestMessageId = messages[0]?.id;

  // Scroll to bottom on mount or new bottom message
  useEffect(() => {
    if (!bottomRef.current) return;
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [newestMessageId, typists.size]);

  // After older messages are prepended, restore scroll position so the view doesn't jump
  useEffect(() => {
    if (!isLoadingMore && containerRef.current && prevScrollHeightRef.current > 0) {
      const newScrollHeight = containerRef.current.scrollHeight;
      containerRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [isLoadingMore]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    if (scrollTop < 100 && hasMore && !isLoadingMore) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Oldest first (top → bottom); memoized so reverse() doesn't run on every render
  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Index of the last message sent by the current user that the other participant has seen
  const lastSeenIdx = useMemo(() => {
    if (!otherLastReadAt) return -1;
    return displayMessages.reduce((found, msg, idx) => {
      if (
        msg.senderUsername === user?.username &&
        msg.status !== "sending" &&
        new Date(otherLastReadAt) >= new Date(msg.createdAt)
      ) {
        return idx;
      }
      return found;
    }, -1);
  }, [displayMessages, otherLastReadAt, user?.username]);

  const typistList = useMemo(() => Array.from(typists.values()), [typists]);

  return (
    <div
      className="flex-1 overflow-y-auto p-4 custom-scrollbar"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {isLoadingMore && (
        <div className="sticky top-4 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-surface-container shadow-md rounded-full px-4 py-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-on-surface-variant">Loading...</span>
          </div>
        </div>
      )}

      {!hasMore && messages.length > 0 && (
        <div className="text-center py-6 text-xs text-on-surface-variant">
          This is the beginning of the conversation.
        </div>
      )}

      {messages.length === 0 && !isLoadingMore && (
        <div className="h-full flex items-center justify-center flex-col text-center space-y-3">
          <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center">
             <span className="text-2xl">👋</span>
          </div>
          <h3 className="text-lg font-semibold">Say hello!</h3>
          <p className="text-sm text-on-surface-variant max-w-[200px]">
            Send a message to start the conversation.
          </p>
        </div>
      )}

      {isDecrypting && (
        <div className="flex flex-col space-y-3 animate-pulse">
          {[72, 48, 96, 56, 80].map((w, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <div
                className={`h-9 rounded-2xl bg-surface-container-high ${i % 2 === 0 ? "rounded-br-sm" : "rounded-bl-sm"}`}
                style={{ width: `${w}%`, maxWidth: "75%" }}
              />
            </div>
          ))}
        </div>
      )}

      <div className={`flex flex-col space-y-1 ${isDecrypting ? "invisible" : ""}`}>
        {displayMessages.map((msg, idx) => {
          const isMine = msg.senderUsername === user?.username;

          const next = displayMessages[idx + 1];
          const isLastInGroup =
            !next ||
            next.senderUsername !== msg.senderUsername ||
            minuteBucket(next.createdAt) !== minuteBucket(msg.createdAt);

          const prev = displayMessages[idx - 1];
          const showDateSeparator = !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);

          return (
            <div key={msg.id || msg.tempId}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-surface-container-high" />
                  <span className="text-[11px] text-on-surface-variant font-medium px-1">
                    {formatDay(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-surface-container-high" />
                </div>
              )}
              <MessageBubble
                message={msg}
                isMine={isMine}
                showTime={isLastInGroup}
                isLastInGroup={isLastInGroup}
                onRetry={msg.status === "failed" && onRetry ? () => onRetry(msg) : undefined}
              />
              {idx === lastSeenIdx && (
                <p className="text-[11px] text-on-surface-variant text-right pr-1 -mt-2 mb-2">
                  Seen
                </p>
              )}
            </div>
          );
        })}

        {typistList.map(username => (
          <div key={username} className="mb-4">
            <TypingIndicator username={username} />
          </div>
        ))}

        <div ref={bottomRef} className="h-1 w-full" />
      </div>
    </div>
  );
}
