# mobile/hooks/

Custom React hooks for mobile app.

## Files

### `AuthTokenContext.tsx`
React Context provider for auth tokens. Wraps app, provides `token`, `loading`, `refreshToken()`.
- **Exports**: `AuthTokenProvider`, `AuthTokenContext`
- **Source**: Clerk `useAuth().getToken()`

### `useAuthToken.ts`
Convenience hook to access `AuthTokenContext`. Returns `{ token, loading, refreshToken }`.

### `useChat.ts`
Accesses the `ChatProvider` context. Returns chat state and actions.

### `useChatMessages.ts`
Manages messages for a conversation with E2E encryption support.
- Fetches paginated message history, subscribes to WS events
- Decrypt/encrypt via `chat-crypto.ts`

### `useDiscovery.ts`
Discovery/suggested users and communities. Same pattern as web's `useDiscovery`.
- **Methods**: `loadUsers()`, `likeUser()`, `passUser()`
- **Dependencies**: `useDiscoveryStore`, `useChat`, Clerk auth

### `useMatches.ts`
Match management. Same pattern as web.
- **Methods**: `loadMatches()`, `unmatch()`
- **Dependencies**: `useMatchStore`, `match-api`

### `useProfileCustomization.ts`
Profile customization and backend user sync. Same pattern as web.
- Fetches/creates backend user, loads widget data, saves updates

### `useSpotifyTopMusic.ts`
Fetches user's Spotify top songs, artists, and albums.
- **State**: `SpotifyTopMusicState` (loading, songs, artists, albums)
- **Options**: `SpotifyTopMusicOptions` (enabled, timeRange)
