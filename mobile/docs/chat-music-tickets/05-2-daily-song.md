---
ticket: 5.2
title: Daily song (ephemeral status)
phase: Social
status: done
priority: P3
depends_on: [0.3]
---

# 5.2 — Daily song

**Backend:** daily prompt + ephemeral store (expires 24h). User picks a top track → visible to matches/communities as a status, not a permanent message. Reactions allowed; auto-expire job (reuse the retention-job pattern from the push work).

**Mobile:** status tray at top of the chat list (WhatsApp status style); compose from `getTopTracks`; view others' daily songs with preview.

## Acceptance
- Post a daily song; it shows in the status tray for matches and auto-expires after 24h.
