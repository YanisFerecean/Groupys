---
ticket: 3.9
title: Stickers
phase: Parity
status: todo
priority: P2
depends_on: [0.1]
---

# 3.9 — Stickers

**Goal:** send stickers.

## Backend
- `sticker_packs` / `stickers` (`id, packId, url, name`) OR a fixed bundled set; `STICKER` message type (`payload { stickerId, url }`). Custom uploaded stickers can come later.

## Mobile
- Sticker picker tab in composer attach tray.
- Render sticker as a borderless image bubble (no card chrome). Reactable / replyable.

## Music twist (optional)
- "Music stickers" — animated art of an artist/album that deep-links to it.

## Acceptance
- Sticker picker sends a `STICKER` message; renders large with no bubble background; threads/reacts like any message.
