---
ticket: 0.1
title: Structured message payload + extensible message types
phase: Foundation
status: done
priority: P0
depends_on: []
---

# 0.1 — Structured message payload + extensible message types

**Goal:** let a chat message carry a structured card payload (not just text), end to end.

## Backend (quarkus-groupys)
- Add `payload` JSONB column to `model/Message.java` (nullable). Map as `String` or `JsonNode`; persist raw JSON.
- Add an enum/constant set of message types: `TEXT, TRACK, ALBUM, PLAYLIST, LYRIC, TIMESTAMP, DEDICATION, VOICE, STICKER, NOW_PLAYING_SHARE, TASTE_HANDSHAKE, BLIND_LISTEN, SYSTEM`. Keep `messageType` a string but validate against this set on send.
- Extend `dto/MessageResDto.java` with `messageType` and `payload` (JsonNode/Map). Ensure `buildMessageData()` in `websocket/ChatWebSocket.java` includes payload.
- `chatService.sendMessage(...)` must accept `(conversationId, clerkId, content, messageType, payloadJson)`. Keep a backward-compatible overload defaulting to `TEXT`/null.
- Migration: add the column (Flyway or project's migration mechanism).

## Mobile
- `models/Chat.ts`: add `payload?: Record<string, unknown>` to `Message`; keep `messageType: string`.
- New `models/ChatPayloads.ts`: discriminated `MessagePayload` union per card type (start with `TrackPayload`).
- `lib/chat-ws.ts` send path + `hooks/useChatMessages.ts` optimistic insert must carry `messageType` + `payload`.

## Edge cases
- Unknown `messageType` from server → render a graceful "Unsupported message — update the app" fallback bubble, never crash.

## Acceptance
- A `TEXT` message round-trips unchanged.
- A message with `messageType=TRACK` and a JSON payload persists and is returned over WS + REST.
