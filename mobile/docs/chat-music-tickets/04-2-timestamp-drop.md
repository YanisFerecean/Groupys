---
ticket: 4.2
title: Timestamp drop
phase: Music types
status: todo
priority: P3
depends_on: [2.1]
---

# 4.2 — Timestamp drop

**Goal:** "listen from 1:24" deep link.

- `TIMESTAMP` payload `{ trackRef, positionMs }`.
- Render card "Listen from 1:24". Tap → open Apple Music at position if supported, else open track + preview from the nearest 30s window.
- Compose via a time picker on any track card.

## Acceptance
- Card shows the timestamp and opens the track at (or near) that position.
