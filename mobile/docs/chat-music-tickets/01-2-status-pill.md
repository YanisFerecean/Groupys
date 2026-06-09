---
ticket: 1.2
title: Live status pill in chat header
phase: Live status
status: done
priority: P1
depends_on: [1.1, 0.3]
---

# 1.2 — Live status pill in chat header

**Goal:** chat header shows partner's live track.

## Mobile — `app/(home)/(match)/chat/[conversationId].tsx` header
- Below name/last-seen, render a compact pill when `nowPlaying[otherUserId]` exists: tiny art + "♫ Title — Artist". Animated marquee if long.
- Tap → opens the `TrackCard` sheet (30s preview, add-to-library, open-in-Apple-Music) reusing ticket 0.3.
- Hide pill when null / paused / privacy-off.

## Acceptance
- Pill appears / updates / disappears live.
- Tap opens preview sheet.
