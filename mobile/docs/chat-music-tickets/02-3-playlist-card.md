---
ticket: 2.3
title: Playlist card message type
phase: Cards
status: done
priority: P2
depends_on: [2.1]
---

# 2.3 — Playlist card

**Goal:** `PLAYLIST` message type — share a whole playlist; recipient previews + saves.

## Spec
- `PlaylistPayload { catalogId | userPlaylistId, title, curatorName, artworkUrl, trackCount, appleMusicUrl, previewTrackIds? }`.
- `PlaylistCard`: art collage, title, count, "Preview" (cycles 30s previews of first N), "Save playlist" (`requireMusic`), "Open".

## Edge cases
- User-owned playlists may not be publicly shareable → share catalog playlists; for personal playlists, share as a snapshot link or deny with explanation.

## Acceptance
- Playlist card renders, previews first tracks, saves when subscribed.

## Implementation note
- `PlaylistPayload` + `PLAYLIST` renderer deliver render / preview-cycling / gated-save / open.
  Backend validates the payload shape. An in-chat playlist **picker** is deferred: there is no
  playlist catalog-search source in the backend yet (only track/album/artist search exist), so
  playlist messages are created from a playlist source/payload rather than a chat picker. The
  renderer cycles `payload.previews[]` 30s previews via the shared preview player.
