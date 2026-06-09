---
ticket: 7.1
title: Listen Together (sync-play room)
phase: Sync
status: done
priority: P4
depends_on: [0.2]
---

# 7.1 — Listen Together (sync) — legality-sensitive

> **LEGAL CONSTRAINT (must honor):** Apple Music ToS forbids relaying audio or sharing one stream. Each participant plays from THEIR OWN Apple Music subscription. We sync only **playback position** + play/pause/track-change events. **No audio bytes ever cross the wire.**

## Backend
- Room entity `{ conversationId, hostId, trackRef, positionMs, isPlaying, updatedAt }`. WS events `ROOM_JOIN`, `ROOM_STATE` (host heartbeat ~ every 2–3s + on change), `ROOM_LEAVE`. Host is the clock; followers correct drift toward host position.

## Mobile
- Both must be connected + subscribed (`canPlayFull`). If not → 30s-preview "lite room" (everyone plays the same 30s preview in sync, which IS allowed) OR disable with upsell.
- Drift correction: if `|localPos − hostPos| > ~1.5s`, seek. Debounce seeks. Handle buffering, track end, host leaves (promote or end).
- Floating reactions over the now-playing track (animated, ephemeral, broadcast via WS `REACTION_FLOAT`).

## Edge cases
- A follower lacks the track in their region/catalog → "unavailable for you", keep them in preview mode.
- Network jitter; host backgrounds the app.

## Acceptance
- Two subscribed devices stay within ~1.5s of each other.
- Non-subscribers get the preview-sync fallback or a clear upsell.
- No audio is ever proxied.

## Implementation note
- WS protocol (ROOM_JOIN / ROOM_STATE host heartbeat ~2s / ROOM_LEAVE / REACTION_FLOAT) is
  implemented server-side with an in-memory ListeningRoomService; **only** track ref + positionMs
  + play/pause are relayed, never audio.
- The app currently has no MusicKit full-catalog playback (only the free 30s preview player), so
  Listen Together runs as the **preview-sync "lite room"** for everyone (explicitly permitted):
  all participants play the same 30s preview, followers seek when drift > 1.5s. Full
  subscription-stream sync drops in once native MusicKit playback exists — the protocol is ready.
