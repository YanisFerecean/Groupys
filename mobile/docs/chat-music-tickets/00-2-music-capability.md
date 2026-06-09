---
ticket: 0.2
title: Music capability layer + upsell + manual fallback
phase: Foundation
status: done
priority: P0
depends_on: []
---

# 0.2 — Music capability layer + upsell + manual fallback

**Goal:** one source of truth for what music actions a user can take. Every later music feature routes through this.

## Capability ladder
1. **Subscription + connected** → full feature (now-playing, full playback via user's own stream).
2. **Connected, no active subscription** (or playback right denied) → **30s preview only**; full-play actions show an upsell sheet.
3. **Not connected** → **manual-entry fallback** for content-creation features (catalog search uses the *developer* token, not the user token). Live now-playing has no fallback → hide.
4. **Impossible without subscription and not creatable manually** → **disable/grey** the control; on press show sheet: *"This needs an Apple Music subscription."*

## Mobile
- `hooks/useMusicCapability.ts` → `{ connected, hasSubscription, canPlayFull, canShareNowPlaying, source: 'apple'|'manual'|'none' }`. Derive from `lib/appleMusicAuth.ts` state + backend capability probe.
- `components/music/MusicUpsellSheet.tsx`: bottom sheet, copy "Needs an Apple Music subscription", CTA → Connect (if not connected) or open Apple Music subscription.
- Helper `requireMusic(name)`: returns `'ok'` or shows the sheet.
- `components/music/TrackPicker.tsx`: manual catalog search using existing `lib/musicSearch.ts` (works without user subscription).

## Backend
- `GET /api/music/capability` → `{ connected, subscriptionActive }`. `subscriptionActive` from MusicKit user token / storefront check; if unknown, treat as preview-only.

## Edge cases
- Offline; token expired/invalid (`MusicService` throws "Apple Music not connected"/"invalid") → surface **Reconnect**, not a crash; user revoked subscription mid-session.

## Acceptance
- A gated button greys without subscription and shows the sheet on press.
- Content-creation features fall back to `TrackPicker` when not connected.
