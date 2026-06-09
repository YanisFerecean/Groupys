---
ticket: 6.2
title: Listening party (scheduled group sync)
phase: Community
status: done
priority: P4
depends_on: [7.1]
---

# 6.2 — Listening party

**Backend:** party entity `{ conversationId, hostId, startAt, trackOrPlaylist }`. Scheduled; at start emit `PARTY_START`. Sync = position-only (see ticket 7.1 legality). Thread becomes a live reaction feed.

**Mobile:** schedule UI, countdown, join → sync-play (own stream), floating reactions in thread.

## Acceptance
- Members schedule + join a party; playback syncs (position-only) and reactions float in the thread.
