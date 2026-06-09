---
ticket: 3.1
title: Replies / threads
phase: Parity
status: done
priority: P2
depends_on: [0.1]
---

# 3.1 — Replies / threads

**Backend:** `replyToId` already on `Message` — ensure `MessageResDto` returns the referenced message stub (sender, snippet, type).

**Mobile:** long-press → Reply; render quoted preview above bubble (works for music cards too — show "♫ Track" snippet). Tap quote → scroll to original.

## Acceptance
- Reply renders a tappable quoted preview; works for text and card messages.
