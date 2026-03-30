/**
 * Standalone tests for lib/media.ts — normalizeMediaUrl
 * Run: npx tsx __tests__/media.test.ts
 */
import assert from 'node:assert/strict'

// Stub the env before importing
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080/api'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { normalizeMediaUrl, toAbsoluteUrl } = require('../lib/media') as typeof import('../lib/media')

// ── normalizeMediaUrl ──────────────────────────────────────────────

// null / undefined / empty → null
assert.equal(normalizeMediaUrl(null), null, 'null input → null')
assert.equal(normalizeMediaUrl(undefined), null, 'undefined input → null')
assert.equal(normalizeMediaUrl(''), null, 'empty string → null')

// Absolute URL passthrough
assert.equal(
  normalizeMediaUrl('https://cdn.example.com/img.jpg'),
  'https://cdn.example.com/img.jpg',
  'absolute https URL returned as-is',
)
assert.equal(
  normalizeMediaUrl('http://cdn.example.com/img.jpg'),
  'http://cdn.example.com/img.jpg',
  'absolute http URL returned as-is',
)

// Flat key (no slashes)
assert.equal(
  normalizeMediaUrl('abc123.jpg'),
  'http://localhost:8080/api/posts/media/abc123.jpg',
  'flat key builds correct URL',
)

// Nested key with slashes
assert.equal(
  normalizeMediaUrl('uploads/2024/img.jpg'),
  'http://localhost:8080/api/posts/media/uploads/2024/img.jpg',
  'nested key with slashes builds correct URL',
)

// Legacy /api/posts/media/ prefix — stripped and rebuilt
assert.equal(
  normalizeMediaUrl('/api/posts/media/abc123.jpg'),
  'http://localhost:8080/api/posts/media/abc123.jpg',
  'legacy prefix stripped and rebuilt',
)

// Legacy prefix with nested key
assert.equal(
  normalizeMediaUrl('/api/posts/media/uploads/2024/img.jpg'),
  'http://localhost:8080/api/posts/media/uploads/2024/img.jpg',
  'legacy prefix with nested key stripped and rebuilt',
)

// ── toAbsoluteUrl ──────────────────────────────────────────────────

assert.equal(toAbsoluteUrl(undefined), undefined, 'undefined → undefined')
assert.equal(
  toAbsoluteUrl('https://cdn.example.com/img.jpg'),
  'https://cdn.example.com/img.jpg',
  'absolute URL passthrough',
)
assert.equal(
  toAbsoluteUrl('/api/posts/media/abc123.jpg'),
  'http://localhost:8080/api/posts/media/abc123.jpg',
  'relative URL gets base host prepended',
)

console.log('✓ All media.test.ts tests passed')
