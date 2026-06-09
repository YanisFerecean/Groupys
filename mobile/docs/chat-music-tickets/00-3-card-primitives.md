---
ticket: 0.3
title: Music card primitives + 30s preview player + renderer registry
phase: Foundation
status: done
priority: P0
depends_on: [0.1, 0.2]
---

# 0.3 — Card primitives + preview player + renderer registry

**Goal:** reusable presentational cards + a shared preview player used by every music message type, plus a renderer registry the bubble delegates to.

## Mobile
- `components/music/TrackCard.tsx`, `AlbumCard.tsx`, `PlaylistCard.tsx` (pure presentational: artwork, title, subtitle, actions slot).
- `hooks/usePreviewPlayer.ts` on `expo-audio`: single **global** player (only one preview at a time across the whole chat list), play/pause, 30s scrubber, auto-stop, releases on unmount. 30s preview URLs are free/public — no subscription needed.
- Card actions: "Add to library" (needs subscription → `requireMusic`), "Open in Apple Music" (deep link `music://`, always allowed).
- `components/chat/messageRenderers.tsx`: registry mapping `messageType -> component`. `MessageBubble` delegates to it, keeping its current text path as the `TEXT` renderer and the 0.1 fallback for unknown types.

## Acceptance
- A `TRACK` message renders the card with a working 30s scrubber.
- Only one preview plays at a time across the list.
- "Add to library" greys without subscription.
