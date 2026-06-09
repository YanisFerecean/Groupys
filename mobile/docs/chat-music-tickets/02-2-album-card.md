---
ticket: 2.2
title: Album card message type
phase: Cards
status: done
priority: P2
depends_on: [2.1]
---

# 2.2 — Album card

**Goal:** `ALBUM` message type.

## Spec
- `AlbumPayload { catalogId, title, artistName, artworkUrl, trackCount, appleMusicUrl }`.
- `AlbumCard` render: art, title, artist, track count, "Open in Apple Music", "Save album" (`requireMusic`).
- Send from album screens + picker.

## Acceptance
- Album card renders, saves (gated), opens.
