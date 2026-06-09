---
ticket: 1.4
title: Ambient match banner
phase: Live status
status: todo
priority: P2
depends_on: [1.1]
---

# 1.4 — Ambient match banner

**Goal:** when both participants are live-listening to the same song/artist, show a celebratory banner.

## Mobile
- In `ChatProvider` / chat screen, compare own now-playing vs partner now-playing. On match (same `songId`, or same `artistId` for the looser variant), show an in-app banner via `useNotificationBannerStore`: "You're both vibing to <Song> right now". Debounce so it fires once per shared listening session.
- Optional: tap banner → start a Listening Together room (ticket 7.1) if available.

## Edge cases
- Avoid spam (one banner per match streak). Clear when either stops.

## Acceptance
- Playing the same track on both devices triggers exactly one banner.
