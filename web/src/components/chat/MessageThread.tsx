"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { Message } from "@/types/chat";
import { useUser } from "@clerk/nextjs";
import { chatWs } from "@/lib/ws";

interface MessageThreadProps {
  messages: Message[];
  conversationId: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  otherLastReadAt?: string | null;
  onRetry?: (msg: Message) => void;
}

export function MessageThread({ messages, conversationId, hasMore, isLoadingMore, onLoadMore, otherLastReadAt, onRetry }: MessageThreadProps) {
  const { user } = useUser();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const [typists, setTypists] = useState<Map<string, string>>(new Map());

  // Listen to typing events
  useEffect(() => {
    const unsubs = [
      chatWs.on("TYPING", (payload: any) => {
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
  }, [conversationId, user?.id]);

  // Scroll to bottom on mount or new bottom message
  useEffect(() => {
    // Very simple auto-scroll: if newest message changes or typing changes, scroll down
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages[0]?.id, typists.size]); // messages[0] is the newest conceptually, wait, let's make sure our messages array is newest-first or oldest-first.
  // Wait, in useMessages we do [payload, ...prev] - so index 0 is newest.
  // But we render them in reverse! Let's ensure we render them bottom-up.

  // After older messages are prepended, restore scroll position so the view doesn't jump
  useEffect(() => {
    if (!isLoadingMore && containerRef.current && prevScrollHeightRef.current > 0) {
      const newScrollHeight = containerRef.current.scrollHeight;
      containerRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [isLoadingMore]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    if (scrollTop < 100 && hasMore && !isLoadingMore) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
      onLoadMore();
    }
  };

  // We have newest at index 0. We need to render oldest first (top) to newest (bottom).
  // So we spread and reverse.
  const displayMessages = [...messages].reverse();

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

      <div className="flex flex-col space-y-1">
        {(() => {
          // Index of the last message sent by current user that has been seen by the other participant
          const lastSeenIdx = otherLastReadAt
            ? displayMessages.reduce((found, msg, idx) => {
                if (
                  msg.senderUsername === user?.username &&
                  msg.status !== "sending" &&
                  new Date(otherLastReadAt) >= new Date(msg.createdAt)
                ) {
                  return idx;
                }
                return found;
              }, -1)
            : -1;

          return displayMessages.map((msg, idx) => {
            const isMine = msg.senderUsername === user?.username;
            return (
              <div key={msg.id || msg.tempId}>
                <MessageBubble
                  message={msg}
                  isMine={isMine}
                  onRetry={msg.status === "failed" && onRetry ? () => onRetry(msg) : undefined}
                />
                {idx === lastSeenIdx && (
                  <p className="text-[11px] text-on-surface-variant text-right pr-1 -mt-2 mb-2">
                    Seen
                  </p>
                )}
              </div>
            );
          });
        })()}

        {Array.from(typists.values()).map(username => (
          <div key={username} className="mb-4">
            <TypingIndicator username={username} />
          </div>
        ))}
        
        <div ref={bottomRef} className="h-1 w-full" />
      </div>
    </div>
  );
}
