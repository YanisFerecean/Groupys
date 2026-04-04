# backend/.../websocket/

WebSocket endpoint for real-time chat.

## Files

### `ChatWebSocket.java`
WebSocket endpoint at `/api/ws/chat`.
- **Auth**: Client must send `AUTH {token}` as first message within 10 seconds; server validates JWT and responds `AUTH_OK`
- **Session state**: `ConcurrentHashMap<connectionId, clerkId>`
- **Message types**:
  - `MESSAGE_SEND` → persists message, broadcasts `MESSAGE_NEW` to all participants
  - `MESSAGE_DELETED` → broadcasts deletion
  - `TYPING_START` / `TYPING_STOP` → broadcasts to conversation participants
  - `MARK_READ` → updates read receipts
  - `SYNC` → client sends on reconnect to catch up missed events
  - `PRESENCE_UPDATE` → broadcast online/offline status
  - `ERROR` → server error response

### `WebSocketMessage.java`
Message envelope: `{ type: String, data: Object }`. Used for both inbound and outbound serialization.

## Protocol Flow

```
Client                          Server
  |── ws://host/api/ws/chat ──────→|  (connect)
  |── { type: "AUTH", token } ────→|  (authenticate)
  |←── { type: "AUTH_OK" } ───────|  (confirmed)
  |── { type: "SYNC" } ──────────→|  (on reconnect only)
  |←── { type: "MESSAGE_NEW" } ──|  (real-time events)
  |── { type: "MESSAGE_SEND" } ──→|  (send message)
  |── { type: "TYPING_START" } ──→|  (typing indicator)
```
