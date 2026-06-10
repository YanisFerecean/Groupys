"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Message, MessageReaction, ReplyStub, TrackPayload } from "@/types/chat";
import { fetchMessages, postMessage, ApiError } from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { useAuth } from "@clerk/nextjs";
import { isEncrypted } from "@/lib/crypto";
import { useMessageCrypto } from "./useMessageCrypto";

const MAX_MESSAGES = 300;

type CryptFn = (content: string) => Promise<string>;

export function useMessages(
  conversationId: string | null,
  decryptFn?: CryptFn,
  encryptFn?: CryptFn
) {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [rateLimitError, setRateLimitError] = useState(false);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use extracted crypto hook
  const { messages, setMessages, decryptBatch, isDecrypting } = useMessageCrypto([], decryptFn);

  // Encrypt function ref
  const encryptFnRef = useRef(encryptFn);
  useEffect(() => {
    encryptFnRef.current = encryptFn;
  }, [encryptFn]);

  // Live snapshot of messages for event-driven callbacks that must read current
  // state (e.g. deciding add-vs-remove on a reaction toggle) without re-creating
  // the callback on every message change.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
    return () => {
      isMounted = false;
    };
  }, [conversationId, getToken, decryptBatch, setMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const unsubs = [
      chatWs.on("MESSAGE_NEW", async (payload: Message) => {
        if (payload.conversationId !== conversationId) return;

        // Decrypt incoming message
        let content = payload.content;
        const fn = decryptFn;
        if (fn && isEncrypted(content)) {
          content = await fn(content).catch(
            () => "[Encrypted message — decryption failed]"
          );
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
          const next = [msg, ...prev];
          return next.length > MAX_MESSAGES ? next.slice(0, MAX_MESSAGES) : next;
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

      // Edit / delete / blind-listen reveal — server sends the authoritative message.
      chatWs.on("MESSAGE_UPDATED", async (payload: Message) => {
        if (payload.conversationId !== conversationId) return;
        let content = payload.content;
        const fn = decryptFn;
        if (fn && isEncrypted(content)) {
          content = await fn(content).catch(() => "[Encrypted message — decryption failed]");
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.id ? { ...payload, content, status: "sent" } : m))
        );
      }),

      // Emoji / track reactions — server broadcasts the full reaction list.
      chatWs.on(
        "REACTION_UPDATE",
        (payload: { messageId: string; conversationId?: string; reactions: MessageReaction[] }) => {
          if (payload.conversationId && payload.conversationId !== conversationId) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m))
          );
        }
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [conversationId, decryptFn, setMessages]);

  const loadMore = useCallback(
    async (page: number) => {
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
          return combined.length > MAX_MESSAGES
            ? combined.slice(0, MAX_MESSAGES)
            : combined;
        });
      } catch (e) {
        console.error("loadMore failed", e);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, isLoading, hasMore, getToken, decryptBatch, setMessages]
  );

  const sendMessage = useCallback(
    async (
      content: string,
      senderId: string,
      senderUsername: string,
      reply?: { replyToId: string; replyTo?: ReplyStub | null }
    ) => {
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
        replyToId: reply?.replyToId ?? null,
        replyTo: reply?.replyTo ?? null,
        createdAt: new Date().toISOString(),
        tempId,
        status: "sending",
      };

      setMessages((prev) => [tempMsg, ...prev]);

      try {
        const token = await getToken();
        const toSend = encryptFn ? await encryptFn(content) : content;
        const saved = await postMessage(
          conversationId,
          { content: toSend, replyToId: reply?.replyToId },
          token
        );
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.tempId === tempId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...saved, status: "sent", content };
          return updated;
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
          setRateLimitError(true);
          rateLimitTimerRef.current = setTimeout(() => setRateLimitError(false), 4000);
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
    },
    [conversationId, getToken, encryptFn, setMessages]
  );

  const resendMessage = useCallback(
    async (tempId: string, content: string) => {
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
        const saved = await postMessage(conversationId, { content: toSend }, token);
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.tempId === tempId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...saved, status: "sent", content };
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
    },
    [conversationId, getToken, encryptFn, setMessages]
  );

  /**
   * Send a non-text card/media message (image, voice, track, dedication, …).
   * The structured `payload`/`mediaUrl` is never encrypted; only the human-facing
   * text label is stored as `content` (and that label stays plaintext too, so
   * reply snippets and last-message previews render — matching mobile).
   */
  const sendStructured = useCallback(
    async (
      opts: {
        messageType: string;
        contentLabel: string;
        payload?: Record<string, unknown> | null;
        mediaUrl?: string | null;
        replyToId?: string | null;
        replyTo?: ReplyStub | null;
      },
      senderId: string,
      senderUsername: string
    ): Promise<Message | undefined> => {
      if (!conversationId) return;

      const tempId = Math.random().toString(36).substring(7);
      const tempMsg: Message = {
        id: `temp-${tempId}`,
        conversationId,
        senderId,
        senderUsername,
        senderDisplayName: null,
        senderProfileImage: null,
        content: opts.contentLabel,
        messageType: opts.messageType,
        payload: opts.payload ?? null,
        mediaUrl: opts.mediaUrl ?? null,
        isDeleted: false,
        replyToId: opts.replyToId ?? null,
        replyTo: opts.replyTo ?? null,
        createdAt: new Date().toISOString(),
        tempId,
        status: "sending",
      };
      setMessages((prev) => [tempMsg, ...prev]);

      try {
        const token = await getToken();
        const saved = await postMessage(
          conversationId,
          {
            content: opts.contentLabel,
            messageType: opts.messageType,
            payload: opts.payload ?? undefined,
            mediaUrl: opts.mediaUrl ?? undefined,
            replyToId: opts.replyToId ?? undefined,
          },
          token
        );
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.tempId === tempId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...saved, status: "sent" };
          return updated;
        });
        return saved;
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
          setRateLimitError(true);
          rateLimitTimerRef.current = setTimeout(() => setRateLimitError(false), 4000);
          setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
        } else {
          console.error("Failed to send message:", err);
          setMessages((prev) => prev.map((m) => (m.tempId === tempId ? { ...m, status: "failed" } : m)));
        }
        return undefined;
      }
    },
    [conversationId, getToken, setMessages]
  );

  /** Edit own text message: optimistic update locally, encrypt, broadcast over WS. */
  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const trimmed = newContent.trim();
      if (!trimmed) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: trimmed, edited: true } : m))
      );
      const fn = encryptFnRef.current;
      const toSend = fn ? await fn(trimmed) : trimmed;
      chatWs.send({ type: "MESSAGE_EDIT", messageId, content: toSend });
    },
    [setMessages]
  );

  /** Soft-delete own message: optimistic tombstone locally, broadcast over WS. */
  const deleteMessage = useCallback(
    (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: "" } : m))
      );
      chatWs.send({ type: "MESSAGE_DELETE", messageId });
    },
    [setMessages]
  );

  /** Toggle an emoji reaction. Server reconciles via REACTION_UPDATE. */
  const toggleReaction = useCallback(
    (messageId: string, emoji: string, myUserId: string) => {
      const msg = messagesRef.current.find((m) => m.id === messageId);
      const has = !!msg?.reactions?.some(
        (r) => r.userId === myUserId && r.type !== "track" && r.emoji === emoji
      );
      chatWs.send({ type: has ? "REACTION_REMOVE" : "REACTION_ADD", messageId, emoji });
      // Optimistic — REACTION_UPDATE will overwrite with the authoritative list.
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions ?? [];
          const next = has
            ? reactions.filter((r) => !(r.userId === myUserId && r.type !== "track" && r.emoji === emoji))
            : [...reactions, { type: "emoji" as const, emoji, userId: myUserId }];
          return { ...m, reactions: next };
        })
      );
    },
    [setMessages]
  );

  /** Toggle a track (music) reaction. Server reconciles via REACTION_UPDATE. */
  const toggleTrackReaction = useCallback(
    (messageId: string, track: TrackPayload, myUserId: string) => {
      const msg = messagesRef.current.find((m) => m.id === messageId);
      const has = !!msg?.reactions?.some(
        (r) => r.userId === myUserId && r.type === "track" && r.track?.id === track.id
      );
      if (has) {
        chatWs.send({ type: "REACTION_TRACK_REMOVE", messageId, trackId: track.id });
      } else {
        chatWs.send({ type: "REACTION_TRACK_ADD", messageId, track });
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions ?? [];
          const next = has
            ? reactions.filter((r) => !(r.userId === myUserId && r.type === "track" && r.track?.id === track.id))
            : [...reactions, { type: "track" as const, track, userId: myUserId }];
          return { ...m, reactions: next };
        })
      );
    },
    [setMessages]
  );

  return {
    messages,
    isLoading,
    hasMore,
    loadMore,
    sendMessage,
    sendStructured,
    resendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    toggleTrackReaction,
    rateLimitError,
    isDecrypting,
  };
}
