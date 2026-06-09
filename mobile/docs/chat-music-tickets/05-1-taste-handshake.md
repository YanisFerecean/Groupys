---
ticket: 5.1
title: Taste handshake icebreaker
phase: Social
status: done
priority: P1
depends_on: [0.1]
---

# 5.1 — Taste handshake

**Goal:** on a new match, auto-post an icebreaker card of shared artists/genres. (Priority — leverages existing genre/match data.)

## Backend
- On conversation create from a match (accepted, or first message), compute shared artists/genres from existing data (`MusicService.getTopArtistsByUserId` + stored genres) for both users.
- Insert a `SYSTEM`/`TASTE_HANDSHAKE` message with payload `{ sharedArtists[], sharedGenres[], overlapScore }`. Idempotent — one per conversation.

## Mobile
- `TASTE_HANDSHAKE` renderer — "You both love <Artist>, <Artist> + 2 more". CTAs: "Send a song by <Artist>" (→ picker prefiltered), "See their profile".

## Edge cases
- No overlap → friendly fallback ("You both have eclectic taste — break the ice").

## Acceptance
- First opening a new match shows the handshake card seeded from real genre data; exactly one per conversation.
