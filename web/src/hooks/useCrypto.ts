import { useCallback, useEffect, useState } from "react";
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
import { uploadPublicKey } from "@/lib/chat-api";

export function useCrypto() {
  const { getToken } = useAuth();
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [ready, setReady] = useState(false);

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

  return { ready, makeEncrypt, makeDecrypt };
}
