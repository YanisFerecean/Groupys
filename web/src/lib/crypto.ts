// E2E encryption utilities using Web Crypto API.
// Protocol: ECDH P-256 key exchange → AES-GCM-256 message encryption.
// Both sides derive the same shared key: ECDH(myPriv, theirPub) === ECDH(theirPriv, myPub).

const DB_NAME = "groupys-e2e";
const STORE_NAME = "keys";
const KEY_ID = "keyPair";

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadKeyPair(): Promise<CryptoKeyPair | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY_ID);
    req.onsuccess = () => resolve((req.result as CryptoKeyPair) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveKeyPair(keyPair: CryptoKeyPair): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(keyPair, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Key generation & serialisation ────────────────────────────────────────────

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false, // private key is non-extractable — it never leaves IndexedDB
    ["deriveKey"]
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "spki",
    raw.buffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
}

// ── Encryption / Decryption ───────────────────────────────────────────────────

async function deriveSharedKey(myPrivateKey: CryptoKey, theirPublicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(
  myPrivateKey: CryptoKey,
  partnerPublicKey: CryptoKey,
  plaintext: string
): Promise<string> {
  const sharedKey = await deriveSharedKey(myPrivateKey, partnerPublicKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, encoded);
  return JSON.stringify({
    v: 1,
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  });
}

export async function decryptMessage(
  myPrivateKey: CryptoKey,
  partnerPublicKey: CryptoKey,
  encryptedJson: string
): Promise<string> {
  const { iv: ivB64, ct: ctB64 } = JSON.parse(encryptedJson) as { iv: string; ct: string };
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const sharedKey = await deriveSharedKey(myPrivateKey, partnerPublicKey);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, sharedKey, ct);
  return new TextDecoder().decode(plain);
}

/** Returns true when a message content string is an E2E encrypted payload. */
export function isEncrypted(content: string): boolean {
  if (!content.startsWith("{")) return false;
  try {
    const obj = JSON.parse(content) as Record<string, unknown>;
    return obj.v === 1 && typeof obj.iv === "string" && typeof obj.ct === "string";
  } catch {
    return false;
  }
}
