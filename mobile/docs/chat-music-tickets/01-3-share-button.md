---
ticket: 1.3
title: Now-playing share button in composer
phase: Live status
status: todo
priority: P1
depends_on: [0.3, 2.1]
---

# 1.3 — Now-playing share button in composer

**Goal:** one-tap inject current track as a `TRACK` card message.

## Mobile — `components/chat/MessageComposer.tsx`
- Add a music-note button (left of input). Enabled only when `canShareNowPlaying`.
- On tap: read own current track (backend now-playing, or local now-playing if available), send a `TRACK` message (`messageType=TRACK`, `payload=track`). No copy-paste.
- If nothing playing → open `TrackPicker` (manual). If not connected → `requireMusic`.

## Acceptance
- Tap with a song playing posts a track card instantly.
- With nothing playing, opens the picker.
