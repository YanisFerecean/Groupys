"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Message } from "@/types/chat";
import { isEncrypted } from "@/lib/crypto";

type CryptFn = (content: string) => Promise<string>;

const DECRYPT_FAILED = "[Encrypted message — decryption failed]";
const SNIPPET_MAX = 80;

/** A message needs a decryption pass when its body or its quoted reply snippet is ciphertext. */
function needsDecrypt(m: Message): boolean {
  return isEncrypted(m.content) || (!!m.replyTo && isEncrypted(m.replyTo.snippet));
}

/**
 * Decrypts a message body and, independently, its quoted reply snippet (the server stores
 * the referenced message's ciphertext there, so an image reply to a text message still needs
 * the snippet decrypted). Mirrors the mobile client's decryptPayload.
 */
async function decryptOne(fn: CryptFn, m: Message): Promise<Message> {
  const contentEncrypted = isEncrypted(m.content);
  const snippetEncrypted = !!m.replyTo && isEncrypted(m.replyTo.snippet);
  if (!contentEncrypted && !snippetEncrypted) return m;

  const [content, snippet] = await Promise.all([
    contentEncrypted ? fn(m.content).catch(() => DECRYPT_FAILED) : Promise.resolve(m.content),
    snippetEncrypted ? fn(m.replyTo!.snippet).catch(() => DECRYPT_FAILED) : Promise.resolve(null),
  ]);

  const next: Message = { ...m, content };
  if (snippetEncrypted && snippet != null && m.replyTo) {
    next.replyTo = {
      ...m.replyTo,
      snippet: snippet.length <= SNIPPET_MAX ? snippet : `${snippet.slice(0, SNIPPET_MAX)}…`,
    };
  }
  return next;
}

// ── Hook return type ───────────────────────────────────────────────────────────

interface UseMessageCryptoReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  decryptBatch: (msgs: Message[]) => Promise<Message[]>;
  decryptSingle: (msg: Message) => Promise<Message>;
  isDecrypting: boolean;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMessageCrypto(
  initialMessages: Message[] = [],
  decryptFn?: CryptFn
): UseMessageCryptoReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const decryptFnRef = useRef(decryptFn);

  // Keep ref updated for non-reactive access
  useEffect(() => {
    decryptFnRef.current = decryptFn;
  }, [decryptFn]);

  /** Decrypts a single message (body + reply snippet) if encrypted. */
  const decryptSingle = useCallback(async (msg: Message): Promise<Message> => {
    const fn = decryptFnRef.current;
    if (!fn) return msg;
    return decryptOne(fn, msg);
  }, []);

  /** Decrypts a batch of messages. */
  const decryptBatch = useCallback(async (msgs: Message[]): Promise<Message[]> => {
    const fn = decryptFnRef.current;
    if (!fn) return msgs;
    return Promise.all(msgs.map((m) => decryptOne(fn, m)));
  }, []);

  // Auto-decrypt messages when decryptFn becomes available (e.g. the partner key arrived
  // after the first page loaded).
  useEffect(() => {
    if (!decryptFn) return;

    const snapshot = messages;
    if (!snapshot.some(needsDecrypt)) return;

    let isMounted = true;
    Promise.all(snapshot.map((m) => decryptOne(decryptFn, m))).then((decrypted) => {
      if (!isMounted) return;
      // Merge by id so messages that arrived while decrypting aren't dropped.
      const byId = new Map(decrypted.map((m) => [m.id, m]));
      setMessages((prev) => prev.map((m) => byId.get(m.id) ?? m));
    });

    return () => {
      isMounted = false;
    };
  }, [decryptFn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computed state
  const isDecrypting = !!decryptFn && messages.length > 0 && messages.some((m) => isEncrypted(m.content));

  return {
    messages,
    setMessages,
    decryptBatch,
    decryptSingle,
    isDecrypting,
  };
}
