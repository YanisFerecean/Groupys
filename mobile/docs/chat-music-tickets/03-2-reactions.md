---
ticket: 3.2
title: Reactions (emoji)
phase: Parity
status: done
priority: P2
depends_on: [0.1]
---

# 3.2 — Reactions (emoji)

**Backend:** `message_reactions` table (`messageId, userId, emoji, createdAt`); WS `REACTION_ADD`/`REACTION_REMOVE`; include reaction summary in `MessageResDto`.

**Mobile:** long-press reaction bar; render reaction chips under bubble; optimistic.

> Sets up ticket 4.5 "reaction = track".

## Acceptance
- Add/remove emoji reaction syncs across both clients; chips aggregate counts.
