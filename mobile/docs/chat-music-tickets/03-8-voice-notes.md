---
ticket: 3.8
title: Voice notes
phase: Parity
status: done
priority: P2
depends_on: [0.1]
---

# 3.8 — Voice notes

**Mobile:** record with `expo-audio`, upload, `VOICE` message (`mediaUrl` + `durationMs` + waveform peaks in payload). Render waveform + play/scrub.

> Base for ticket 4.4 "voice over beat".

## Acceptance
- Record → send → playback with a scrubbable waveform on both clients.
