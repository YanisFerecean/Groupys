---
ticket: 4.5
title: Reaction = track
phase: Music types
status: done
priority: P3
depends_on: [3.2]
---

# 4.5 — Reaction = track

Extend reactions (ticket 3.2): allow reacting with a track instead of emoji. Reaction value becomes `{ type: 'emoji' | 'track', ... }`. Render a mini track chip under the message; tap → preview. Picker via `TrackPicker`.

## Acceptance
- React to any message with a track; a tappable mini-chip renders and previews.
