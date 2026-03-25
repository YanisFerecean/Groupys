import { useState, useEffect, useCallback } from "react";
import { Message } from "@/types/chat";
import { fetchMessages, postMessage } from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { useAuth } from "@clerk/nextjs";

export function useMessages(conversationId: string | null) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Initial load
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const token = await getToken();
        const msgs = await fetchMessages(conversationId!, 0, 30, token);
        if (isMounted) {
          setMessages(msgs);
          setHasMore(msgs.length === 30);
        }
      } catch (err) {
        console.error("Failed to load msgs:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [conversationId, getToken]);

  // Real-time updates subscription
  useEffect(() => {
    if (!conversationId) return;

    const unsubs = [
      chatWs.on("MESSAGE_NEW", (payload: Message) => {
        if (payload.conversationId === conversationId) {
          setMessages((prev) => {
            // Replace outgoing temp message with real one if matched
            if (payload.tempId) {
              const idx = prev.findIndex((m) => m.tempId === payload.tempId);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...payload, status: "sent" };
                return updated;
              }
            }
            // Double check for dupes by ID
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [payload, ...prev]; // Newer messages are at index 0
          });
        }
      }),
      chatWs.on("MESSAGE_ACK", (payload: { tempId: string; messageId: string; createdAt: string }) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.tempId === payload.tempId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { 
              ...updated[idx], 
              id: payload.messageId, 
              createdAt: payload.createdAt, 
              status: "sent" 
            };
            return updated;
          }
          return prev;
        });
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [conversationId]);

  const loadMore = useCallback(async (page: number) => {
    if (!conversationId || isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const token = await getToken();
      const msgs = await fetchMessages(conversationId, page, 30, token);
      if (msgs.length < 30) setHasMore(false);
      // Append older messages, deduplicating in case real-time prepends shifted the offset window
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = msgs.filter((m) => !existingIds.has(m.id));
        return [...prev, ...fresh];
      });
    } catch (e) {
      console.error("loadMore failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, hasMore, getToken]);

  const resendMessage = useCallback(async (tempId: string, content: string) => {
    if (!conversationId) return;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.tempId === tempId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: "sending" };
      return updated;
    });
    try {
      const token = await getToken();
      const saved = await postMessage(conversationId, content, token);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.tempId === tempId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...saved, status: "sent" };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.tempId === tempId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: "failed" };
        return updated;
      });
    }
  }, [conversationId, getToken]);

  const sendMessage = useCallback(async (content: string, senderId: string, senderUsername: string) => {
    if (!conversationId) return;

    const tempId = Math.random().toString(36).substring(7);
    const tempMsg: Message = {
      id: `temp-${tempId}`,
      conversationId,
      senderId,
      senderUsername,
      senderDisplayName: null,
      senderProfileImage: null,
      content,
      messageType: "text",
      isDeleted: false,
      replyToId: null,
      createdAt: new Date().toISOString(),
      tempId,
      status: "sending",
    };

    setMessages((prev) => [tempMsg, ...prev]);

    try {
      const token = await getToken();
      const saved = await postMessage(conversationId, content, token);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.tempId === tempId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...saved, status: "sent" };
        return updated;
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.tempId === tempId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: "failed" };
        return updated;
      });
    }
  }, [conversationId, getToken]);

  return { messages, isLoading, hasMore, loadMore, sendMessage, resendMessage };
}
