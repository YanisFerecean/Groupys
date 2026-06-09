---
ticket: 3.5
title: In-chat search
phase: Parity
status: todo
priority: P3
depends_on: [0.1]
---

# 3.5 — Search

**Backend:** `GET /conversations/{id}/messages/search?q=` (content + card title/artist text).

**Mobile:** in-chat search UI, highlight + jump to result.

## Acceptance
- Query returns matching text and card messages; tapping a result scrolls to it.
