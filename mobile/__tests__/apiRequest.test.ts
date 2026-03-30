/**
 * Standalone tests for lib/apiRequest.ts — error normalization
 * Run: npx tsx __tests__/apiRequest.test.ts
 */
import assert from 'node:assert/strict'

// Stub the env before importing
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080/api'

// Mock global fetch
let mockResponse: { status: number; ok: boolean; statusText: string; body?: unknown; headers?: Record<string, string> }

;(globalThis as any).fetch = async (_url: string, _init: any) => ({
  ok: mockResponse.ok,
  status: mockResponse.status,
  statusText: mockResponse.statusText,
  headers: {
    get: (key: string) => mockResponse.headers?.[key.toLowerCase()] ?? null,
  },
  json: async () => mockResponse.body,
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiRequest, ApiError } = require('../lib/apiRequest') as typeof import('../lib/apiRequest')

async function main() {
  // ── Successful JSON response ───────────────────────────────────────

  mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: { id: '1', name: 'test' },
  }

  const result = await apiRequest<{ id: string; name: string }>('/test', { token: 'tok' })
  assert.deepEqual(result, { id: '1', name: 'test' }, 'parses JSON body on success')

  // ── 204 No Content returns undefined ───────────────────────────────

  mockResponse = {
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: { 'content-length': '0' },
  }

  const noContent = await apiRequest<void>('/test', { method: 'DELETE', token: 'tok' })
  assert.equal(noContent, undefined, '204 returns undefined')

  // ── Error with JSON message body ───────────────────────────────────

  mockResponse = {
    ok: false,
    status: 422,
    statusText: 'Unprocessable Entity',
    body: { message: 'Validation failed: name is required' },
  }

  try {
    await apiRequest('/test', { method: 'POST', token: 'tok', body: {} })
    assert.fail('should have thrown')
  } catch (err) {
    assert.ok(err instanceof ApiError, 'throws ApiError')
    assert.equal((err as any).status, 422, 'preserves status code')
    assert.ok((err as Error).message.includes('Validation failed'), 'extracts message from JSON body')
  }

  // ── Error with error field in body ─────────────────────────────────

  mockResponse = {
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    body: { error: 'Something went wrong' },
  }

  try {
    await apiRequest('/test', { token: null })
    assert.fail('should have thrown')
  } catch (err) {
    assert.ok(err instanceof ApiError)
    assert.equal((err as any).status, 500)
    assert.ok((err as Error).message.includes('Something went wrong'), 'extracts error field')
  }

  // ── Error with non-JSON body falls back to statusText ──────────────

  ;(globalThis as any).fetch = async () => ({
    ok: false,
    status: 503,
    statusText: 'Service Unavailable',
    headers: { get: () => null },
    json: async () => { throw new Error('not json') },
  })

  try {
    await apiRequest('/test', { token: null })
    assert.fail('should have thrown')
  } catch (err) {
    assert.ok(err instanceof ApiError)
    assert.equal((err as any).status, 503)
    assert.ok((err as Error).message.includes('Service Unavailable'), 'falls back to statusText')
  }

  console.log('✓ All apiRequest.test.ts tests passed')
}

main().catch((err) => { console.error(err); process.exit(1) })
