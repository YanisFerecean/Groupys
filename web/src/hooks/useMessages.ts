import { useState, useEffect, useCallback, useRef } from "react";
import { Message } from "@/types/chat";
import { fetchMessages, postMessage, ApiError } from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { useAuth } from "@clerk/nextjs";
import { isEncrypted } from "@/lib/crypto";

const MAX_MESSAGES = 300;

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
  const [rateLimitError, setRateLimitError] = useState(false);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref so the load function always uses the latest decryptFn without
  // being a reactive dependency (which would cause unnecessary re-fetches).
  const decryptFnRef = useRef(decryptFn);
  useEffect(() => { decryptFnRef.current = decryptFn; }, [decryptFn]);

  const decryptBatch = useCallback(async (msgs: Message[]): Promise<Message[]> => {
    const fn = decryptFnRef.current;
    if (!fn) return msgs;
    return Promise.all(
      msgs.map(async (m) => {
        if (!isEncrypted(m.content)) return m;
        const content = await fn(m.content).catch(() => "[Encrypted message — decryption failed]");
        return { ...m, content };
      })
    );
  }, []);

  // Initial load — runs when conversationId changes (not when decryptFn changes to avoid double fetches).
  // Uses decryptFnRef so it decrypts immediately if the key is already available.
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
        const decrypted = await decryptBatch(msgs);
        if (isMounted) {
          setMessages(decrypted);
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
  }, [conversationId, getToken, decryptBatch]);

  // When decryptFn becomes available after messages are already loaded, decrypt them in-place.
  // This handles the case where messages loaded before the crypto key was ready.
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

  // Real-time subscription — only re-registers when conversationId changes.
  // Uses decryptFnRef so the handler always has the latest key without being a reactive dep.
  useEffect(() => {
    if (!conversationId) return;

    const unsubs = [
      chatWs.on("MESSAGE_NEW", async (payload: Message) => {
        if (payload.conversationId !== conversationId) return;

        let content = payload.content;
        const fn = decryptFnRef.current;
        if (fn && isEncrypted(content)) {
          content = await fn(content).catch(() => "[Encrypted message — decryption failed]");
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
  }, [conversationId]);

  const loadMore = useCallback(async (page: number) => {
    if (!conversationId || isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const token = await getToken();
      const msgs = await fetchMessages(conversationId, page, 30, token);
      if (msgs.length < 30) setHasMore(false);

      const decrypted = await decryptBatch(msgs);

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = decrypted.filter((m) => !existingIds.has(m.id));
        const combined = [...prev, ...fresh];
        return combined.length > MAX_MESSAGES ? combined.slice(0, MAX_MESSAGES) : combined;
      });
    } catch (e) {
      console.error("loadMore failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, hasMore, getToken, decryptBatch]);

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
      if (err instanceof ApiError && err.status === 429) {
        if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
        setRateLimitError(true);
        rateLimitTimerRef.current = setTimeout(() => setRateLimitError(false), 4000);
        // Remove the optimistic message — it was never accepted by the server
        setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      } else {
        console.error("Failed to send message:", err);
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.tempId === tempId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status: "failed" };
          return updated;
        });
      }
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

  const isDecrypting = messages.length > 0 && messages.some((m) => isEncrypted(m.content));

  return { messages, isLoading, hasMore, loadMore, sendMessage, resendMessage, rateLimitError, isDecrypting };
}
