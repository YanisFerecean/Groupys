---
ticket: 3.7
title: Media (images) + link previews
phase: Parity
status: done
priority: P2
depends_on: [0.1]
---

# 3.7 — Media (images) + link previews

**Images:** reuse existing media upload (MinIO) — `IMAGE` message type, `mediaUrl`.

**Link previews:** backend OG fetch (reuse the public post-meta OG endpoint from the deep-link work) → `LINK_PREVIEW` payload; render a card.

**Apple Music links** auto-upgrade to `TRACK`/`ALBUM`/`PLAYLIST` cards by parsing the URL.

## Acceptance
- Image sends + renders; pasted URL renders a preview card; an Apple Music URL becomes the matching music card.
