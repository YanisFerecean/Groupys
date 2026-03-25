import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  generateKeyPair,
  saveKeyPair,
  loadKeyPair,
  exportPublicKey,
  importPublicKey,
  encryptMessage,
  decryptMessage,
  isEncrypted,
} from "@/lib/crypto";
import { fetchPublicKey, uploadPublicKey } from "@/lib/chat-api";

export function useCrypto() {
  const { getToken } = useAuth();
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [ready, setReady] = useState(false);
  // Cache imported CryptoKey objects by username to avoid re-importing on every call
  const partnerKeyCache = useRef<Map<string, CryptoKey>>(new Map());

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        let pair = await loadKeyPair();
        if (!pair) {
          pair = await generateKeyPair();
          await saveKeyPair(pair);
        }
        // Always upload to keep server in sync (idempotent PUT)
        const pubKeyB64 = await exportPublicKey(pair.publicKey);
        const token = await getToken();
        await uploadPublicKey(pubKeyB64, token);
        if (isMounted) {
          setKeyPair(pair);
          setReady(true);
        }
      } catch (e) {
        console.error("[E2E] Key init failed:", e);
      }
    }
    init();
    return () => { isMounted = false; };
  }, [getToken]);

  /**
   * Returns an encrypt function bound to a partner's public key.
   * Call once per conversation: const encrypt = makeEncrypt(partnerPublicKey)
   */
  const makeEncrypt = useCallback(
    (partnerPublicKeyB64: string) =>
      async (plaintext: string): Promise<string> => {
        if (!keyPair) return plaintext;
        try {
          const partnerKey = await importPublicKey(partnerPublicKeyB64);
          return encryptMessage(keyPair.privateKey, partnerKey, plaintext);
        } catch (e) {
          console.error("[E2E] Encrypt failed:", e);
          return plaintext; // fall back to plaintext rather than silently dropping
        }
      },
    [keyPair]
  );

  /**
   * Returns a decrypt function bound to a partner's public key.
   * Call once per conversation: const decrypt = makeDecrypt(partnerPublicKey)
   */
  const makeDecrypt = useCallback(
    (partnerPublicKeyB64: string) =>
      async (content: string): Promise<string> => {
        if (!keyPair || !isEncrypted(content)) return content;
        try {
          const partnerKey = await importPublicKey(partnerPublicKeyB64);
          return decryptMessage(keyPair.privateKey, partnerKey, content);
        } catch (e) {
          console.error("[E2E] Decrypt failed:", e);
          return "[Encrypted message — decryption failed]";
        }
      },
    [keyPair]
  );

  /**
   * Decrypts a single content string using a partner's public key, fetching and
   * caching the key by username. Safe to call for every conversation preview —
   * each partner key is only fetched once per session.
   */
  const decryptForPartner = useCallback(
    async (partnerUsername: string, content: string): Promise<string> => {
      if (!keyPair || !isEncrypted(content)) return content;
      try {
        let partnerKey = partnerKeyCache.current.get(partnerUsername);
        if (!partnerKey) {
          const token = await getToken();
          const b64 = await fetchPublicKey(partnerUsername, token);
          if (!b64) return content;
          partnerKey = await importPublicKey(b64);
          partnerKeyCache.current.set(partnerUsername, partnerKey);
        }
        return decryptMessage(keyPair.privateKey, partnerKey, content);
      } catch {
        return "[Encrypted message]";
      }
    },
    [keyPair, getToken]
  );

  return { ready, makeEncrypt, makeDecrypt, decryptForPartner };
}
