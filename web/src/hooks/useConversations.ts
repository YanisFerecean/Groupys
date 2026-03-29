import { useEffect, useCallback, useRef, useState } from "react";
import { Message } from "@/types/chat";
import { fetchConversations, markRead, acceptConversationRequest, denyConversationRequest } from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { useAuth } from "@clerk/nextjs";
import { useConversationStore } from "@/store/conversationStore";

const PAGE_SIZE = 20;

export function useConversations() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const store = useConversationStore();
  const { conversations, setConversations, appendConversations, updateConversation, removeConversation, bubbleConversation } = store;

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
  }, [getToken, setConversations]);

  useEffect(() => {
    const unsubs = [
      chatWs.on("MESSAGE_NEW", (payload: Message) => {
        bubbleConversation(payload.conversationId, {
          lastMessage: payload.content,
          lastMessageAt: payload.createdAt,
          unreadCount: (useConversationStore.getState().conversations.find(c => c.id === payload.conversationId)?.unreadCount ?? 0) + 1,
        });
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [bubbleConversation]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const convos = await fetchConversations(token, cursorRef.current, PAGE_SIZE);
      appendConversations(convos);
      setHasMore(convos.length === PAGE_SIZE);
      if (convos.length > 0) {
        cursorRef.current = convos[convos.length - 1].updatedAt ?? undefined;
      }
    } catch (e) {
      console.error("Failed to load more conversations:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, appendConversations]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      const token = await getTokenRef.current();
      await markRead(conversationId, token);
      chatWs.send({ type: "READ_RECEIPT", conversationId });
      updateConversation(conversationId, { unreadCount: 0 });
    } catch (e) {
      console.error("markAsRead failed", e);
    }
  }, [updateConversation]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptRequest = useCallback(async (conversationId: string) => {
    const token = await getTokenRef.current();
    await acceptConversationRequest(conversationId, token);
    updateConversation(conversationId, { requestStatus: "ACCEPTED" });
  }, [updateConversation]); // eslint-disable-line react-hooks/exhaustive-deps

  const denyRequest = useCallback(async (conversationId: string) => {
    const token = await getTokenRef.current();
    await denyConversationRequest(conversationId, token);
    removeConversation(conversationId);
  }, [removeConversation]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    conversations,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    markAsRead,
    setConversations,
    acceptRequest,
    denyRequest,
  };
}
