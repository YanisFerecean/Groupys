# web/src/hooks/

Custom React hooks for data fetching, WebSocket subscriptions, and state management.

## Files

### `useWebSocket.ts`
Manages the `chatWs` WebSocket singleton lifecycle.
- Connects on mount (when authenticated), disconnects on unmount
- Handles `pagehide`/`pageshow` for bfcache lifecycle
- **Returns**: `{ isConnected: boolean, chatWs }`

### `useConversations.ts`
Manages conversation list with pagination.
- **State**: `conversations`, `isLoading`, `isLoadingMore`, `hasMore`
- **Methods**: `fetchConversations()`, `markRead()`, `acceptConversationRequest()`, `denyConversationRequest()`
- Subscribes to WS events for real-time conversation updates
- **Dependencies**: `conversationStore`, `chatWs`, Clerk auth

### `useMessages.ts`
Manages messages for a specific conversation with optional E2E encryption.
- **Params**: `conversationId`, `decryptFn?`, `encryptFn?`
- **State**: `messages`, `isLoading`, `hasMore`, `rateLimitError`
- **Methods**: `fetchMessages()`, `postMessage()`, `decryptBatch()`
- **Constants**: `MAX_MESSAGES = 300` (caps in-memory messages)
- Subscribes to WS `MESSAGE_NEW`, `MESSAGE_DELETED` events

### `usePresence.ts`
Tracks online users via WebSocket presence events.
- **State**: `onlineUsers: Set<string>`
- **Returns**: `isOnline(userId): boolean`
- Listens to `"PRESENCE"` WS events

### `useDiscovery.ts`
Manages suggested users for discovery/matching.
- **State**: `users`, `usersLoading`, `usersRefreshing`, `isFetchingMore`
- **Methods**: `loadUsers(refresh?)`, `loadMoreUsers()`, `likeUser()`, `passUser()`
- Loads 4 users per request; on `likeUser()` response, checks for mutual match → `setPendingMatchModal()`

### `useMatches.ts`
Manages matched users and match history.
- **State**: `matches`, `matchesLoading`
- **Methods**: `loadMatches()`, `unmatch(matchId)`
- **Dependencies**: `matchStore`, `match-api`

### `useProfileCustomization.ts`
Manages user profile customization and Spotify sync.
- **State**: `profile`, `backendUserId`, `isProfileLoaded`, `spotifyConnected`, `isSaving`
- **Methods**: `updateProfile()`, `updateUsername()`, `updateProfileImage()`, `removeProfileImage()`
- On init: fetches or creates backend user, loads profile from widgets JSON, uploads E2E public key

### `useCrypto.ts`
E2E encryption using Web Crypto API (ECDH P-256 + AES-GCM-256).
- **State**: `keyPair: CryptoKeyPair`, `ready: boolean`
- **Methods**: `encrypt(plaintext, partnerPublicKey)`, `decrypt(ciphertext, partnerPublicKey)`
- **Cache**: `partnerKeyCache` (Map) for imported public keys
- On init: loads or generates key pair from IndexedDB, uploads public key to backend

## Dependencies
- Internal: [lib/](lib.md) (API clients), [store/](store.md) (Zustand stores), [types/](types.md)
