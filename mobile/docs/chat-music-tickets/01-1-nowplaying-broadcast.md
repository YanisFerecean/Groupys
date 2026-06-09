---
ticket: 1.1
title: Now-playing presence broadcast
phase: Live status
status: done
priority: P1
depends_on: [0.2]
---

# 1.1 — Now-playing presence broadcast

**Goal:** broadcast each user's current track to people who share a conversation with them, privacy-gated.

## Backend
- Add WS event `NOW_PLAYING { userId, track | null, isPlaying }` in `websocket/WebSocketMessage.java`.
- Source: `MusicService.getCurrentlyPlayingByUserId`. Prefer **client-push** (`NOW_PLAYING_UPDATE` from the device that owns the session) with a server throttle; fall back to a periodic poll (~20–30s) for accuracy.
- Privacy: per-user setting `share_now_playing` (default ON for matches, configurable). Only fan out to conversation participants. Never broadcast if subscription/token absent.
- Store last-known now-playing in the presence service so a freshly opened chat can request it (`NOW_PLAYING_REQUEST` → reply).

## Mobile
- `components/chat/ChatProvider.tsx` subscribes to `NOW_PLAYING`, keeps a `Map<userId, track|null>`.
- Settings toggle "Share what I'm listening to".

## Edge cases
- Not connected → never broadcast. Paused vs playing (include `isPlaying`). Rapid track switching → throttle. User offline → clear.

## Acceptance
- When A plays a song, B (sharing a chat with A) receives `NOW_PLAYING` within the throttle window.
- Toggling privacy off stops it.
