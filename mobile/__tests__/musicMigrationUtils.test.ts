/**
 * Standalone tests for Apple Music migration utility helpers.
 * Run: npx tsx __tests__/musicMigrationUtils.test.ts
 */
import assert from 'node:assert/strict'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  buildWidgetSyncFlags,
  resolveMusicConnected,
  resolveMusicSync,
  resolveWidgetSyncFlags,
} = require('../lib/musicCompatibility') as typeof import('../lib/musicCompatibility')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getMusicErrorMessage } = require('../lib/musicErrors') as typeof import('../lib/musicErrors')

async function main() {
  // Connection compatibility: prefer canonical field and fallback to legacy alias.
  assert.equal(resolveMusicConnected(true, false), true)
  assert.equal(resolveMusicConnected(undefined, true), true)
  assert.equal(resolveMusicConnected(undefined, undefined), false)

  // Profile sync compatibility.
  assert.equal(resolveMusicSync(true, false), true)
  assert.equal(resolveMusicSync(false, true), true)
  assert.equal(resolveMusicSync(false, false), false)
  assert.equal(resolveMusicSync(undefined, undefined), false)

  // Widget sync compatibility: support old and new payload flags.
  assert.equal(resolveWidgetSyncFlags({ syncWithMusic: true }), true)
  assert.equal(resolveWidgetSyncFlags({ syncWithSpotify: true }), true)
  assert.equal(resolveWidgetSyncFlags({ synced: true }), true)
  assert.equal(resolveWidgetSyncFlags({}), false)

  // Transitional write payload includes old and new keys.
  assert.deepEqual(buildWidgetSyncFlags(true), {
    syncWithMusic: true,
    syncWithSpotify: true,
    synced: true,
  })

  // Error mapping coverage for 401/403/429.
  assert.equal(
    getMusicErrorMessage({ status: 401, message: 'API error 401' }, 'fallback'),
    'Apple Music authorization expired. Please reconnect your Apple Music account.',
  )
  assert.equal(
    getMusicErrorMessage({ status: 403, message: 'API error 403' }, 'fallback'),
    'Apple Music access is forbidden for this account. Check your Apple Music subscription and permissions.',
  )
  assert.equal(
    getMusicErrorMessage({ status: 429, message: 'API error 429' }, 'fallback'),
    'Apple Music is rate limiting requests right now. Please try again in a moment.',
  )

  console.log('✓ All musicMigrationUtils.test.ts tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
