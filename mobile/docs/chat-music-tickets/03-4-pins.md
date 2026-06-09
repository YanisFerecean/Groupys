---
ticket: 3.4
title: Pinned messages
phase: Parity
status: todo
priority: P2
depends_on: [0.1]
---

# 3.4 — Pinned messages

**Backend:** `conversation_pins` (`conversationId, messageId, pinnedBy`). WS `PIN_ADD`/`PIN_REMOVE`.

**Mobile:** pin via menu; pinned bar under header; tap → scroll. Music cards pinnable.

> Sets up ticket 6.1 community pinned playlist.

## Acceptance
- Pinning shows a header bar that scrolls to the message; supports card messages.
