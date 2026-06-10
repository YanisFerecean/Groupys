"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Message } from "@/types/chat";
import { fetchPins } from "@/lib/chat-api";
import { chatWs } from "@/lib/ws";
import { isEncrypted } from "@/lib/crypto";

type CryptFn = (content: string) => Promise<string>;

/**
 * Tracks the pinned messages for a conversation: loads them once, stays live via
 * PIN_UPDATE, and exposes pin/unpin toggles. Encrypted text pins are decrypted
 * so the pinned bar can show a readable preview.
 */
export function usePins(conversationId: string | null, decryptFn?: CryptFn) {
  const { getToken } = useAuth();
  const [pins, setPins] = useState<Message[]>([]);

  const decryptPins = useCallback(
    async (list: Message[]): Promise<Message[]> => {
      if (!decryptFn) return list;
      return Promise.all(
        list.map(async (m) => {
          const type = (m.messageType || "TEXT").toUpperCase();
          if (type === "TEXT" && isEncrypted(m.content)) {
            const content = await decryptFn(m.content).catch(() => m.content);
            return { ...m, content };
          }
          return m;
        })
      );
    },
    [decryptFn]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!conversationId) {
        if (mounted) setPins([]);
        return;
      }
      try {
        const token = await getToken();
        const list = await fetchPins(conversationId, token);
        const decrypted = await decryptPins(list);
        if (mounted) setPins(decrypted);
      } catch (e) {
        console.error("Failed to load pins", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [conversationId, getToken, decryptPins]);

  useEffect(() => {
    if (!conversationId) return;
    return chatWs.on("PIN_UPDATE", async (payload: { conversationId: string; pins: Message[] }) => {
      if (payload.conversationId !== conversationId) return;
      const decrypted = await decryptPins(payload.pins ?? []);
      setPins(decrypted);
    });
  }, [conversationId, decryptPins]);

  const pin = useCallback((messageId: string) => chatWs.send({ type: "PIN_ADD", messageId }), []);
  const unpin = useCallback((messageId: string) => chatWs.send({ type: "PIN_REMOVE", messageId }), []);
  const isPinned = useCallback((messageId: string) => pins.some((p) => p.id === messageId), [pins]);
  const togglePin = useCallback(
    (messageId: string) => (isPinned(messageId) ? unpin(messageId) : pin(messageId)),
    [isPinned, pin, unpin]
  );

  return { pins, pin, unpin, togglePin, isPinned };
}
