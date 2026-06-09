---
ticket: 2.1
title: Send & render Track card message type
phase: Cards
status: done
priority: P1
depends_on: [0.1, 0.3]
---

# 2.1 — Track card message type

**Goal:** first-class `TRACK` message: send from now-playing, picker, or search; render rich. Foundation everything else builds on.

## Mobile
- **Sending:** from composer music button (1.3), from a "+" attach menu, and from any track context ("Send to chat").
- **Payload** (`TrackPayload`): `{ catalogId, isrc?, title, artistName, albumName?, artworkUrl, previewUrl, durationMs, appleMusicUrl }`.
- **Rendering:** `messageRenderers` `TRACK` → `TrackCard` with `usePreviewPlayer` scrubber + actions. Threads/replies/reacts exactly like a text message (same wrapper, footer, long-press menu).

## Backend
- Validate payload shape for `TRACK`; persist; fan out.

## Acceptance
- A track card sent by A renders identically for B.
- It is replyable / reactable.
- Preview works for both regardless of subscription.
