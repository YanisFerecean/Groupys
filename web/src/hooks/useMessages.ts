import { useState, useEffect, useCallback } from "react";
import { Message } from "@/types/chat";
import { fetchMessages, postMessage } from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { useAuth } from "@clerk/nextjs";
import { isEncrypted } from "@/lib/crypto";

type CryptFn = (content: string) => Promise<string>;

export function useMessages(
  conversationId: string | null,
  decryptFn?: CryptFn,
  encryptFn?: CryptFn
) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Initial load — runs when conversationId changes (not when decryptFn changes to avoid double fetches)
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

  // When decryptFn becomes available, decrypt already-loaded encrypted messages in-place
  useEffect(() => {
    if (!decryptFn) return;
    let isMounted = true;

    setMessages((prev) => {
      const hasEncrypted = prev.some((m) => isEncrypted(m.content));
      if (!hasEncrypted) return prev;

      Promise.all(
        prev.map(async (m) => {
          if (!isEncrypted(m.content)) return m;
          const content = await decryptFn(m.content).catch(() => "[Encrypted message — decryption failed]");
          return { ...m, content };
        })
      ).then((decrypted) => {
        if (isMounted) setMessages(decrypted);
      });

      return prev; // return unchanged immediately; async update follows
    });

    return () => { isMounted = false; };
  }, [decryptFn]);

  // Real-time subscription — re-registers when conversationId or decryptFn changes
  useEffect(() => {
    if (!conversationId) return;

    const unsubs = [
      chatWs.on("MESSAGE_NEW", async (payload: Message) => {
        if (payload.conversationId !== conversationId) return;

        let content = payload.content;
        if (decryptFn && isEncrypted(content)) {
          content = await decryptFn(content).catch(() => "[Encrypted message — decryption failed]");
        }
        const msg = { ...payload, content };

        setMessages((prev) => {
          if (payload.tempId) {
            const idx = prev.findIndex((m) => m.tempId === payload.tempId);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = { ...msg, status: "sent" };
              return updated;
            }
          }
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [msg, ...prev];
        });
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
              status: "sent",
            };
            return updated;
          }
          return prev;
        });
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [conversationId, decryptFn]);

  const loadMore = useCallback(async (page: number) => {
    if (!conversationId || isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const token = await getToken();
      const msgs = await fetchMessages(conversationId, page, 30, token);
      if (msgs.length < 30) setHasMore(false);

      const decrypted = decryptFn
        ? await Promise.all(
            msgs.map(async (m) => {
              if (!isEncrypted(m.content)) return m;
              const content = await decryptFn(m.content).catch(() => "[Encrypted message — decryption failed]");
              return { ...m, content };
            })
          )
        : msgs;

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = decrypted.filter((m) => !existingIds.has(m.id));
        return [...prev, ...fresh];
      });
    } catch (e) {
      console.error("loadMore failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, hasMore, getToken, decryptFn]);

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
      content, // plaintext for optimistic display
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
      const toSend = encryptFn ? await encryptFn(content) : content;
      const saved = await postMessage(conversationId, toSend, token);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.tempId === tempId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...saved, status: "sent", content }; // keep plaintext in state
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
  }, [conversationId, getToken, encryptFn]);

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
      const toSend = encryptFn ? await encryptFn(content) : content;
      const saved = await postMessage(conversationId, toSend, token);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.tempId === tempId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...saved, status: "sent", content }; // keep plaintext
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
  }, [conversationId, getToken, encryptFn]);

  return { messages, isLoading, hasMore, loadMore, sendMessage, resendMessage };
}
