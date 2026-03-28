import * as SecureStore from 'expo-secure-store'
import { getRandomValues } from 'expo-crypto'
import { gcm } from '@noble/ciphers/aes'
import { p256 } from '@noble/curves/nist.js'
import { Buffer } from 'buffer'

export interface ChatKeyPair {
  privateKey: string
  publicKey: string
}

const STORAGE_KEY = 'groupys.chat.keypair.v1'
const P256_SPKI_PREFIX = Buffer.from(
  '3059301306072a8648ce3d020106082a8648ce3d030107034200',
  'hex',
)

export async function loadKeyPair(): Promise<ChatKeyPair | null> {
  const stored = await SecureStore.getItemAsync(STORAGE_KEY)
  if (!stored) {
    return null
  }

  try {
    const parsed = JSON.parse(stored) as Partial<ChatKeyPair>
    if (typeof parsed.privateKey !== 'string' || typeof parsed.publicKey !== 'string') {
      return null
    }
    return {
      privateKey: parsed.privateKey,
      publicKey: parsed.publicKey,
    }
  } catch {
    return null
  }
}

export async function saveKeyPair(keyPair: ChatKeyPair): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(keyPair))
}

export async function ensureKeyPair(): Promise<ChatKeyPair> {
  const existing = await loadKeyPair()
  if (existing) {
    return existing
  }

  const created = generateKeyPair()
  await saveKeyPair(created)
  return created
}

export async function encryptMessage(
  privateKeyBase64: string,
  partnerPublicKeyBase64: string,
  plaintext: string,
): Promise<string> {
  const sharedKey = deriveSharedKey(privateKeyBase64, partnerPublicKeyBase64)
  const iv = randomBytes(12)
  const payload = gcm(sharedKey, iv).encrypt(Buffer.from(plaintext, 'utf8'))

  return JSON.stringify({
    v: 1,
    iv: Buffer.from(iv).toString('base64'),
    ct: Buffer.from(payload).toString('base64'),
  })
}

export async function decryptMessage(
  privateKeyBase64: string,
  partnerPublicKeyBase64: string,
  encryptedJson: string,
): Promise<string> {
  const parsed = JSON.parse(encryptedJson) as {
    v?: number
    iv?: string
    ct?: string
  }

  if (parsed.v !== 1 || typeof parsed.iv !== 'string' || typeof parsed.ct !== 'string') {
    throw new Error('Unsupported encrypted payload')
  }

  const combined = Buffer.from(parsed.ct, 'base64')
  if (combined.length <= 16) {
    throw new Error('Invalid encrypted payload')
  }

  const iv = Buffer.from(parsed.iv, 'base64')
  const plaintext = gcm(
    deriveSharedKey(privateKeyBase64, partnerPublicKeyBase64),
    iv,
  ).decrypt(combined)

  return Buffer.from(plaintext).toString('utf8')
}

export function isEncrypted(content: string): boolean {
  if (!content.startsWith('{')) {
    return false
  }

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    return parsed.v === 1
      && typeof parsed.iv === 'string'
      && typeof parsed.ct === 'string'
  } catch {
    return false
  }
}

function generateKeyPair(): ChatKeyPair {
  let privateKey = randomBytes(32)
  while (!p256.utils.isValidSecretKey(privateKey)) {
    privateKey = randomBytes(32)
  }

  const publicKey = p256.getPublicKey(privateKey, false)
  return {
    privateKey: Buffer.from(privateKey).toString('base64'),
    publicKey: Buffer.concat([
      P256_SPKI_PREFIX,
      Buffer.from(publicKey),
    ]).toString('base64'),
  }
}

function deriveSharedKey(
  privateKeyBase64: string,
  partnerPublicKeyBase64: string,
): Buffer {
  const privateKey = new Uint8Array(Buffer.from(privateKeyBase64, 'base64'))
  if (!p256.utils.isValidSecretKey(privateKey)) {
    throw new Error('Invalid private key')
  }

  const partnerPublicKey = decodePublicKey(partnerPublicKeyBase64)
  const sharedSecret = p256.getSharedSecret(privateKey, partnerPublicKey, false)
  return Buffer.from(sharedSecret.slice(1, 33))
}

function decodePublicKey(publicKeyBase64: string): Uint8Array {
  const der = Buffer.from(publicKeyBase64, 'base64')
  if (der.length !== P256_SPKI_PREFIX.length + 65) {
    throw new Error('Unsupported public key length')
  }

  const prefix = der.subarray(0, P256_SPKI_PREFIX.length)
  if (!bytesEqual(prefix, P256_SPKI_PREFIX)) {
    throw new Error('Unsupported public key format')
  }

  return new Uint8Array(der.subarray(P256_SPKI_PREFIX.length))
}

function randomBytes(length: number): Uint8Array {
  return getRandomValues(new Uint8Array(length))
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false
  }

  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false
    }
  }

  return true
}
