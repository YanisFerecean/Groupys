import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv, randomBytes, webcrypto } from 'node:crypto'
import { p256 } from '@noble/curves/nist.js'

const subtle = webcrypto.subtle
const SPKI_PREFIX = Buffer.from(
  '3059301306072a8648ce3d020106082a8648ce3d030107034200',
  'hex',
)

function mobileGenerateKeyPair() {
  let privateKey = new Uint8Array(randomBytes(32))
  while (!p256.utils.isValidSecretKey(privateKey)) {
    privateKey = new Uint8Array(randomBytes(32))
  }

  const publicKey = p256.getPublicKey(privateKey, false)
  return {
    privateKey: Buffer.from(privateKey).toString('base64'),
    publicKey: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKey)]).toString('base64'),
  }
}

function decodePublicKey(publicKeyBase64) {
  const der = Buffer.from(publicKeyBase64, 'base64')
  const prefix = der.subarray(0, SPKI_PREFIX.length)
  assert.equal(prefix.equals(SPKI_PREFIX), true, 'unexpected SPKI prefix')
  return new Uint8Array(der.subarray(SPKI_PREFIX.length))
}

function deriveSharedKey(privateKeyBase64, publicKeyBase64) {
  const privateKey = new Uint8Array(Buffer.from(privateKeyBase64, 'base64'))
  const publicKey = decodePublicKey(publicKeyBase64)
  const sharedSecret = p256.getSharedSecret(privateKey, publicKey, false)
  return Buffer.from(sharedSecret.slice(1, 33))
}

function mobileEncrypt(privateKeyBase64, partnerPublicKeyBase64, plaintext) {
  const key = deriveSharedKey(privateKeyBase64, partnerPublicKeyBase64)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const payload = Buffer.concat([ciphertext, cipher.getAuthTag()])
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    ct: payload.toString('base64'),
  })
}

function mobileDecrypt(privateKeyBase64, partnerPublicKeyBase64, encryptedJson) {
  const parsed = JSON.parse(encryptedJson)
  const combined = Buffer.from(parsed.ct, 'base64')
  const ciphertext = combined.subarray(0, combined.length - 16)
  const authTag = combined.subarray(combined.length - 16)
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveSharedKey(privateKeyBase64, partnerPublicKeyBase64),
    Buffer.from(parsed.iv, 'base64'),
  )
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

async function webGenerateKeyPair() {
  const keyPair = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  )

  return {
    keyPair,
    publicKey: Buffer.from(await subtle.exportKey('spki', keyPair.publicKey)).toString('base64'),
  }
}

async function webEncrypt(privateKey, partnerPublicKeyBase64, plaintext) {
  const partnerPublicKey = await subtle.importKey(
    'spki',
    Buffer.from(partnerPublicKeyBase64, 'base64'),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const aesKey = await subtle.deriveKey(
    { name: 'ECDH', public: partnerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
  const iv = randomBytes(12)
  const ciphertext = Buffer.from(
    await subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, Buffer.from(plaintext, 'utf8')),
  )
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    ct: ciphertext.toString('base64'),
  })
}

async function webDecrypt(privateKey, partnerPublicKeyBase64, encryptedJson) {
  const parsed = JSON.parse(encryptedJson)
  const partnerPublicKey = await subtle.importKey(
    'spki',
    Buffer.from(partnerPublicKeyBase64, 'base64'),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const aesKey = await subtle.deriveKey(
    { name: 'ECDH', public: partnerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  const plaintext = await subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(parsed.iv, 'base64') },
    aesKey,
    Buffer.from(parsed.ct, 'base64'),
  )
  return Buffer.from(plaintext).toString('utf8')
}

const mobileKeys = mobileGenerateKeyPair()
const webKeys = await webGenerateKeyPair()

const mobileToWeb = mobileEncrypt(mobileKeys.privateKey, webKeys.publicKey, 'mobile-to-web')
assert.equal(await webDecrypt(webKeys.keyPair.privateKey, mobileKeys.publicKey, mobileToWeb), 'mobile-to-web')

const webToMobile = await webEncrypt(webKeys.keyPair.privateKey, mobileKeys.publicKey, 'web-to-mobile')
assert.equal(mobileDecrypt(mobileKeys.privateKey, webKeys.publicKey, webToMobile), 'web-to-mobile')

console.log('chat crypto compatibility ok')
