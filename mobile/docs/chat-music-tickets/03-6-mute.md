---
ticket: 3.6
title: Mute conversation
phase: Parity
status: done
priority: P3
depends_on: []
---

# 3.6 — Mute

**Backend:** per-conversation mute (until timestamp). Suppress push (`notification/ExpoPush`) + in-app banner for muted convos.

**Mobile:** mute menu + muted icon in conversation list.

## Acceptance
- Muting stops push + in-app banners until the mute expires; list shows a muted icon.
