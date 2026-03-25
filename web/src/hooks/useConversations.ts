import { useState, useEffect, useCallback, useRef } from "react";
import { Conversation, Message } from "@/types/chat";
import { fetchConversations, markRead } from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { useAuth } from "@clerk/nextjs";

const PAGE_SIZE = 20;

export function useConversations() {
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      cursorRef.current = undefined;
      try {
        const token = await getToken();
        if (token && isMounted) {
          const convos = await fetchConversations(token, undefined, PAGE_SIZE);
          setConversations(convos);
          setHasMore(convos.length === PAGE_SIZE);
          if (convos.length > 0) {
            cursorRef.current = convos[convos.length - 1].updatedAt ?? undefined;
          }
        }
      } catch (e) {
        console.error("Failed to load conversations:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [getToken]);

  useEffect(() => {
    const unsubs = [
      chatWs.on("MESSAGE_NEW", (payload: Message) => {
        setConversations((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((c) => c.id === payload.conversationId);

          if (idx !== -1) {
            const convo = { ...updated[idx] };
            convo.lastMessage = payload.content;
            convo.lastMessageAt = payload.createdAt;
            convo.unreadCount += 1;

            updated.splice(idx, 1);
            updated.unshift(convo); // Bubble up
          }
          return updated;
        });
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const token = await getToken();
      if (!token) return;
      const convos = await fetchConversations(token, cursorRef.current, PAGE_SIZE);
      setConversations((prev) => [...prev, ...convos]);
      setHasMore(convos.length === PAGE_SIZE);
      if (convos.length > 0) {
        cursorRef.current = convos[convos.length - 1].updatedAt ?? undefined;
      }
    } catch (e) {
      console.error("Failed to load more conversations:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, getToken]);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      const token = await getToken();
      await markRead(conversationId, token);
      chatWs.send({ type: "READ_RECEIPT", conversationId });
      
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conversationId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], unreadCount: 0 };
          return updated;
        }
        return prev;
      });
    } catch(e) {
      console.error("markAsRead failed", e);
    }
  }, [getToken]);

  return { conversations, isLoading, isLoadingMore, hasMore, loadMore, markAsRead, setConversations };
}
