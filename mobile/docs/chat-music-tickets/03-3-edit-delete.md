---
ticket: 3.3
title: Edit / delete
phase: Parity
status: done
priority: P2
depends_on: [0.1]
---

# 3.3 — Edit / delete

**Backend:** edit (content + `edited` flag, TEXT only), soft delete (`isDeleted` already). WS `MESSAGE_EDIT`/`MESSAGE_DELETE`.

**Mobile:** long-press menu; render "deleted" tombstone + "edited" marker.

## Acceptance
- Editing updates both clients with an "edited" marker; delete shows a tombstone.
