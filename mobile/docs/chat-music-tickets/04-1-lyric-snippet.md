---
ticket: 4.1
title: Lyric snippet
phase: Music types
status: todo
priority: P3
depends_on: [2.1]
---

# 4.1 — Lyric snippet

**Backend:** lyrics endpoint via Apple time-synced lyrics (subscription-gated by Apple). If unavailable / no subscription → manual paste fallback. `LYRIC` payload `{ trackRef, lines[], startTimeMs?, endTimeMs? }`.

**Mobile:** from a track, pick 1–4 lyric lines → styled quote card (big type, artist attribution, art background). Tap → open track at lyric timestamp (ticket 4.2).

**Gating:** time-synced lyrics need subscription → else manual lyric entry; never block sending.

## Acceptance
- Pick lines → styled lyric card sends; works via manual entry when lyrics API unavailable.
