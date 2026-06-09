---
ticket: 4.6
title: Blind listen (game)
phase: Music types
status: done
priority: P3
depends_on: [2.1]
---

# 4.6 — Blind listen

`BLIND_LISTEN` = `TRACK` payload + `{ hidden: true, guessed: false }`. Render with art blurred + artist/title hidden, only preview playable. Recipient taps "Guess" → input → reveal (fuzzy match artist/title) → card flips to normal + shows correct/incorrect. Optionally track score.

State transitions (reveal event) propagate over WS so both sides update.

## Acceptance
- Sent card hides art/metadata; recipient can preview, guess, and reveal; both clients update on reveal.
