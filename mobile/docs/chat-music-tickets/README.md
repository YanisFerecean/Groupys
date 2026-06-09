# Chat × Music — Tickets

One file per implementation prompt. Hand a single ticket to an agent; each is self-contained (goal / backend / mobile / gating / edge cases / acceptance).

Full narrative + capability matrix: [../CHAT_MUSIC_PLAN.md](../CHAT_MUSIC_PLAN.md).

## Build order
`0.1 → 0.2 → 0.3` (foundation) → Phase 1 → Phase 2 → `5.1` → remainder.

## Index

| # | Ticket | Phase | Depends on |
|---|---|---|---|
| 0.1 | [Structured message payload](00-1-message-payload.md) | Foundation | — |
| 0.2 | [Music capability layer](00-2-music-capability.md) | Foundation | — |
| 0.3 | [Card primitives + preview player](00-3-card-primitives.md) | Foundation | 0.1, 0.2 |
| 1.1 | [Now-playing presence broadcast](01-1-nowplaying-broadcast.md) | Live status | 0.2 |
| 1.2 | [Live status pill](01-2-status-pill.md) | Live status | 1.1, 0.3 |
| 1.3 | [Now-playing share button](01-3-share-button.md) | Live status | 0.3, 2.1 |
| 1.4 | [Ambient match banner](01-4-ambient-match.md) | Live status | 1.1 |
| 2.1 | [Track card message type](02-1-track-card.md) | Cards | 0.1, 0.3 |
| 2.2 | [Album card](02-2-album-card.md) | Cards | 2.1 |
| 2.3 | [Playlist card](02-3-playlist-card.md) | Cards | 2.1 |
| 3.1 | [Replies / threads](03-1-replies.md) | Parity | 0.1 |
| 3.2 | [Reactions (emoji)](03-2-reactions.md) | Parity | 0.1 |
| 3.3 | [Edit / delete](03-3-edit-delete.md) | Parity | 0.1 |
| 3.4 | [Pinned messages](03-4-pins.md) | Parity | 0.1 |
| 3.5 | [Search](03-5-search.md) | Parity | 0.1 |
| 3.6 | [Mute](03-6-mute.md) | Parity | — |
| 3.7 | [Media + link previews](03-7-media-links.md) | Parity | 0.1 |
| 3.8 | [Voice notes](03-8-voice-notes.md) | Parity | 0.1 |
| 3.9 | [Stickers](03-9-stickers.md) | Parity | 0.1 |
| 4.1 | [Lyric snippet](04-1-lyric-snippet.md) | Music types | 2.1 |
| 4.2 | [Timestamp drop](04-2-timestamp-drop.md) | Music types | 2.1 |
| 4.3 | [Song dedication](04-3-dedication.md) | Music types | 2.1 |
| 4.4 | [Voice note over beat](04-4-voice-over-beat.md) | Music types | 3.8 |
| 4.5 | [Reaction = track](04-5-reaction-track.md) | Music types | 3.2 |
| 4.6 | [Blind listen](04-6-blind-listen.md) | Music types | 2.1 |
| 5.1 | [Taste handshake](05-1-taste-handshake.md) | Social | 0.1 |
| 5.2 | [Daily song](05-2-daily-song.md) | Social | 0.3 |
| 6.1 | [Collab playlist](06-1-collab-playlist.md) | Community | 3.4, 2.3 |
| 6.2 | [Listening party](06-2-listening-party.md) | Community | 7.1 |
| 6.3 | [Now-playing roster](06-3-nowplaying-roster.md) | Community | 1.1 |
| 6.4 | [Song of the week vote](06-4-song-of-week.md) | Community | 3.2, 3.4 |
| 7.1 | [Listen together sync](07-1-listen-together.md) | Sync | 0.2 |

## Conventions
- Status values: `todo` / `in-progress` / `done` / `blocked`.
- Every music feature routes through the capability ladder in 0.2 (`requireMusic`).
- Never relay audio (Apple ToS); full playback always from the user's own subscription.
