/**
 * Standalone tests for chat cursor derivation fallback order
 * Run: npx tsx __tests__/chatCursor.test.ts
 */
import assert from 'node:assert/strict'

// Replicate the cursor logic from ChatProvider.tsx
interface Conversation {
  id: string
  lastMessageAt: string | null
  updatedAt: string | null
  createdAt: string
}

function conversationCursor(c: Conversation): string {
  return c.lastMessageAt ?? c.updatedAt ?? c.createdAt
}

function sortByActivity(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) =>
    conversationCursor(b).localeCompare(conversationCursor(a)),
  )
}

// ── conversationCursor prefers lastMessageAt ───────────────────────

assert.equal(
  conversationCursor({
    id: '1',
    lastMessageAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
    createdAt: '2024-01-01T10:00:00Z',
  }),
  '2024-03-01T10:00:00Z',
  'prefers lastMessageAt when all present',
)

// ── falls back to updatedAt when lastMessageAt is null ─────────────

assert.equal(
  conversationCursor({
    id: '2',
    lastMessageAt: null,
    updatedAt: '2024-02-01T10:00:00Z',
    createdAt: '2024-01-01T10:00:00Z',
  }),
  '2024-02-01T10:00:00Z',
  'falls back to updatedAt',
)

// ── falls back to createdAt when both are null ─────────────────────

assert.equal(
  conversationCursor({
    id: '3',
    lastMessageAt: null,
    updatedAt: null,
    createdAt: '2024-01-01T10:00:00Z',
  }),
  '2024-01-01T10:00:00Z',
  'falls back to createdAt',
)

// ── sortByActivity orders newest first ─────────────────────────────

const conversations: Conversation[] = [
  { id: 'old', lastMessageAt: null, updatedAt: null, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'newest', lastMessageAt: '2024-03-15T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'mid', lastMessageAt: null, updatedAt: '2024-02-01T00:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
]

const sorted = sortByActivity(conversations)
assert.deepEqual(
  sorted.map(c => c.id),
  ['newest', 'mid', 'old'],
  'sorted by activity (newest first)',
)

// ── sortByActivity handles empty array ─────────────────────────────

assert.deepEqual(sortByActivity([]), [], 'empty array returns empty')

console.log('✓ All chatCursor.test.ts tests passed')
