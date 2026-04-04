# mobile/lib/

API clients, utilities, and core libraries.

## Files

### `apiRequest.ts`
Base HTTP request handler. Adds Bearer token from Clerk, handles JSON serialization, cache control.
- **Exports**: `ApiError` class, `apiRequest<T>(path, options)` function
- **Base URL**: from `API_URL` in `api.ts`

### `api.ts`
Centralized API layer. Exports `API_URL`, `apiFetch()`, `BackendUser` interface, user CRUD functions, widget serialization (`widgetsToProfile`/`profileToWidgets`).
- Same widget JSON format as web's `lib/api.ts`

### `auth.ts`
Authentication validation utilities.
- **Exports**: `MIN_USERNAME_LENGTH`, `MAX_USERNAME_LENGTH`, `MIN_PASSWORD_LENGTH`, username/email validation functions

### `chat-api.ts`
Chat REST API functions: `fetchConversations()`, `fetchConversation()`, `startConversation()`, `acceptConversationRequest()`, message fetching/sending.

### `chat-crypto.ts`
E2E encryption key pair management using `expo-secure-store` + `@noble/curves` (P-256 ECDH).
- **Exports**: `ChatKeyPair` interface, `loadKeyPair()`, `saveKeyPair()`

### `chat-ws.ts`
`ChatWebSocketClient` class — same architecture as web's `ws.ts`. Auth handshake, exponential backoff reconnect, message queue, SYNC on reconnect.

### `clerk.ts`
Clerk error message extraction helper.

### `communityUtils.ts`
Converts backend `CommunityResDto` to frontend `Community` model with media URL normalization.

### `match-api.ts`
Match API functions: `fetchMatches()`, `fetchMatchHistory()`, `fetchSentLikes()`, `fetchMatch()`, `unmatchUser()`, `withdrawLike()`.

### `media.ts`
Media URL utilities: `normalizeMediaUrl(url)`, `toAbsoluteUrl(path)` — prefixes relative paths with API_URL.

### `musicSearch.ts`
Spotify music search via backend: `searchTracks()`, artist/album search. Returns typed results.

### `profileRoutes.ts`
Route path generation per tab context.
- **Exports**: `HOME_TABS`, `isHomeTab()`, `resolveHomeTab()`, path builders for user/community/post routes

### `timeAgo.ts`
Relative time formatting: `timeAgo(date)` (e.g. "5m ago"), `formatCount(n)` (e.g. "1.2K").

### `logging.ts`
Error serialization: `summarizeError(err)` for debug logging.

### `accountPortal.ts`
Opens Clerk account management portal in external browser via `expo-web-browser`.
