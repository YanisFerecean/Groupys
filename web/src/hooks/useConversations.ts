import { useEffect, useCallback, useRef, useState } from "react";
import {
  fetchConversations,
  fetchConversation,
  markRead,
  acceptConversationRequest,
  denyConversationRequest,
  setConversationMute,
  ApiError,
} from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { useAuth } from "@clerk/nextjs";
import { useConversationStore } from "@/store/conversationStore";
import type { Conversation } from "@/types/chat";

const PAGE_SIZE = 20;

/** The backend pages by activity time — mirror the mobile client's cursor derivation. */
function conversationCursor(c: Conversation): string | undefined {
  return c.lastMessageAt ?? c.updatedAt ?? c.createdAt ?? undefined;
}

export function useConversations() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const store = useConversationStore();
  const { conversations, setConversations, appendConversations, updateConversation, removeConversation, upsertConversation } = store;

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
            cursorRef.current = conversationCursor(convos[convos.length - 1]);
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
        cursorRef.current = conversationCursor(convos[convos.length - 1]);
      }
    } catch (e) {
      console.error("Failed to load more conversations:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, appendConversations]);

  /**
   * Hydrates a conversation that isn't in the loaded pages (deep link, brand-new match…).
   * Returns null — and drops it from the list — when the server says we can't access it.
   */
  const fetchConversationById = useCallback(async (conversationId: string): Promise<Conversation | null> => {
    try {
      const token = await getTokenRef.current();
      if (!token) return null;
      const convo = await fetchConversation(conversationId, token);
      upsertConversation(convo);
      return convo;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
        removeConversation(conversationId);
        return null;
      }
      console.error("Failed to hydrate conversation:", e);
      return null;
    }
  }, [upsertConversation, removeConversation]);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      const token = await getTokenRef.current();
      await markRead(conversationId, token);
      chatWs.send({ type: "READ_RECEIPT", conversationId });
      updateConversation(conversationId, { unreadCount: 0 });
    } catch (e) {
      console.error("markAsRead failed", e);
    }
  }, [updateConversation]);

  const acceptRequest = useCallback(async (conversationId: string) => {
    const token = await getTokenRef.current();
    const updated = await acceptConversationRequest(conversationId, token);
    upsertConversation({ ...updated, requestStatus: "ACCEPTED" });
  }, [upsertConversation]);

  const denyRequest = useCallback(async (conversationId: string) => {
    const token = await getTokenRef.current();
    await denyConversationRequest(conversationId, token);
    removeConversation(conversationId);
  }, [removeConversation]);

  const setMute = useCallback(async (conversationId: string, until: string | null) => {
    const token = await getTokenRef.current();
    const updated = await setConversationMute(conversationId, until, token);
    upsertConversation(updated);
  }, [upsertConversation]);

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
    setMute,
    fetchConversationById,
  };
}
