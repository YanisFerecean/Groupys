---
ticket: 6.1
title: Collab playlist in community thread
phase: Community
status: done
priority: P3
depends_on: [3.4, 2.3]
---

# 6.1 — Collab playlist in thread

**Backend:** a community conversation gets a backing playlist (server-built). Members add tracks from chat → appended; build/refresh an Apple catalog playlist or an internal playlist entity. Pinned (reuse ticket 3.4) `COLLAB_PLAYLIST` card showing live track count.

**Mobile:** "Add to playlist" on any track card in the thread; pinned playlist card with preview + "Save to my library".

## Acceptance
- Adding a track from chat updates the pinned collab playlist live for all members.
