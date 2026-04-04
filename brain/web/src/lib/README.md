# web/src/lib/

API clients, the WebSocket client, and shared utilities.

## Files

### `api.ts`
Main backend API client. Base URL: `NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api"`.

Key exports:
- `apiRequest(path, token, init)` — authenticated fetch wrapper (Bearer token from Clerk)
- `backendUserToProfile(user)` / `profileToWidgets(profile)` — convert backend user ↔ `ProfileCustomization`
- `fetchUserByClerkId`, `createBackendUser`, `updateBackendUser` — user CRUD
- `upsertAlbumRating`, `fetchAlbumRatings`, `fetchMyAlbumRatings`, `deleteAlbumRating`
- `searchCommunities`, `searchUsers`

Widget serialization: widgets are stored as a JSON string in `BackendUser.widgets`; `widgetsToProfile` / `profileToWidgets` handle conversion with position ordering.

### `chat-api.ts`
Chat REST endpoints: fetch conversations, messages, create conversations, mark read, delete messages.

### `match-api.ts`
Match REST endpoints: fetch recommendations, like/pass a user, fetch match history, sent likes.

### `friends-api.ts`
Friendship REST endpoints: follow/unfollow, fetch friends list, pending requests.

### `ws.ts`
`ChatWebSocketClient` class — singleton `chatWs` exported. Features:
- Auth handshake on connect (sends `AUTH` message with Clerk token; waits for `AUTH_OK` before sending anything else)
- Message queue for messages sent before auth completes (except ephemeral `TYPING_START`/`TYPING_STOP`)
- Exponential backoff reconnect (1s → max 30s)
- `SYNC` message sent on reconnect to catch up missed events
- `on(type, handler)` returns an unsubscribe function

See also: [types/chat.ts](../types/README.md)

### `spotify.ts`
Spotify OAuth helpers: initiate authorization, exchange code for tokens, refresh tokens.

### `crypto.ts`
Client-side crypto utilities (likely for E2E message encryption using `@noble/curves`).

### `utils.ts`
`cn(...inputs)` — Tailwind class merging via `clsx` + `tailwind-merge`.

### `imageResize.ts`
Resize images client-side before upload (canvas-based).

### `countries.ts`
Static list of country codes and names for profile country picker.
