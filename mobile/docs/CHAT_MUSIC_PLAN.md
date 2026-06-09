# Groupys — Music-Native Chat: Implementation Prompt Plan

A phased set of **copy-pasteable prompts** for an implementing agent. Each prompt is self-contained: goal, files to touch, backend + mobile work, Apple Music gating, edge cases, acceptance.

> Build order recommendation (per product priority): **Phase 0 → Phase 1 (now-playing + live status) → Phase 2 (track card) → Phase 5.1 (taste handshake)**, then the rest. Phase 0 is a hard prerequisite for everything.

---

## Architecture facts (already true in repo — don't re-derive)

- **Backend music**: `MusicService` exposes `getCurrentlyPlaying(clerkId)` / `getCurrentlyPlayingByUserId(userId)`, `getTopTracks/Artists/Albums`, `getDeveloperToken()`, `connect/disconnect` (MusicKit user token), `getValidUserToken`. Apple catalog DTOs in `dto/apple/`. `AppleMusicApiClient` wraps the Apple API.
- **Chat entity** `model/Message.java`: has `content`, `messageType` (varchar 20, default `"text"`), `mediaUrl`, `replyToId`, `isDeleted`. **No structured payload column yet.**
- **Chat DTO** `dto/MessageResDto.java`, WS envelope `websocket/WebSocketMessage.java` (record `{type, payload}`), socket handlers in `websocket/ChatWebSocket.java`.
- **Mobile model** `models/Chat.ts` (`Message`, `Conversation`, `WsInbound/WsOutbound`). WS client `lib/chat-ws.ts` (typed `.on(type, handler)` + `.send()`, auto-reconnect + queue).
- **Mobile renderer** `components/chat/MessageBubble.tsx` (text-only), composer `components/chat/MessageComposer.tsx`, screen `app/(home)/(match)/chat/[conversationId].tsx`, hooks `hooks/useChat.ts` / `hooks/useChatMessages.ts`, presence/in-app banners via `stores/useNotificationBannerStore` + `components/chat/ChatProvider.tsx`.
- **Mobile music**: `lib/appleMusicAuth.ts`, `lib/musicSearch.ts` / `lib/appleMusicSearch.ts`, `expo-audio` installed. Apple connect UI `components/profile/MusicConnectButton.tsx`.

---

## Cross-cutting rule: Apple Music capability gating

Every music feature must degrade through this ladder. Bake it into Phase 0 so later prompts just call it.

1. **Subscription + connected** → full feature (now-playing, full playback via user's own stream).
2. **Connected, no active subscription** (or playback right denied) → **30s preview only**; full-play actions show an upsell sheet.
3. **Not connected to Apple Music** → **manual-entry fallback** where the feature is content-creation (search catalog, pick track) since catalog search uses the *developer* token, not the user token. Live now-playing has no fallback → hide.
4. **Feature impossible without subscription and not creatable manually** (e.g. live now-playing broadcast, listen-together full audio) → **disable/grey the control**; on press show sheet: *"This needs an Apple Music subscription."* with a Connect / Subscribe CTA.

Define once: `hooks/useMusicCapability()` → `{ connected, hasSubscription, canPlayFull, canShareNowPlaying, source: 'apple' | 'manual' | 'none' }`. Plus `<MusicUpsellSheet/>` and a `requireMusic(capabilityName)` helper that returns either `'ok'` or the reason to show the sheet.

---

# Phase 0 — Foundation (prerequisite)

### Prompt 0.1 — Structured message payload + extensible message types
```
Goal: let a chat message carry a structured card payload (not just text), end to end.

Backend (quarkus-groupys):
- Add `payload` JSONB column to model/Message.java (nullable). Map as String or JsonNode; persist raw JSON.
- Add an enum/constant set of message types: TEXT, TRACK, ALBUM, PLAYLIST, LYRIC, TIMESTAMP, DEDICATION, VOICE, STICKER, NOW_PLAYING_SHARE, TASTE_HANDSHAKE, BLIND_LISTEN, SYSTEM. Keep `messageType` a string but validate against this set on send.
- Extend dto/MessageResDto.java with `messageType` (already implied) and `payload` (JsonNode/Map). Ensure buildMessageData() in ChatWebSocket includes payload.
- chatService.sendMessage(...) must accept (conversationId, clerkId, content, messageType, payloadJson). Keep a backward-compatible overload defaulting to TEXT/null.
- Flyway/migration: add column.

Mobile:
- models/Chat.ts: add `payload?: Record<string, unknown>` to Message; keep `messageType: string`. Add a discriminated `MessagePayload` union type file (models/ChatPayloads.ts) per card type (start with TrackPayload).
- lib/chat-ws.ts send path + useChatMessages optimistic insert must carry messageType + payload.

Edge cases: unknown messageType from server must render a graceful "Unsupported message — update the app" fallback bubble, never crash.

Acceptance: a TEXT message still round-trips unchanged; a message with messageType=TRACK and a JSON payload persists and is returned over WS + REST.
```

### Prompt 0.2 — Music capability layer + upsell + manual fallback
```
Goal: one source of truth for what music actions a user can take.

Mobile:
- hooks/useMusicCapability.ts returning { connected, hasSubscription, canPlayFull, canShareNowPlaying, source }. Derive from existing Apple connect state (lib/appleMusicAuth.ts) and a backend capability probe.
- Backend: add GET /api/music/capability returning { connected, subscriptionActive } (subscriptionActive from MusicKit user token / storefront check; if unknown, treat as preview-only).
- components/music/MusicUpsellSheet.tsx: bottom sheet, copy "Needs an Apple Music subscription", CTA to Connect (if not connected) or open Apple Music subscription.
- helper requireMusic(name): returns 'ok' or shows the sheet.
- Manual fallback search component components/music/TrackPicker.tsx using existing lib/musicSearch.ts (developer-token catalog search — works without user subscription).

Edge cases: offline; token expired (MusicService throws "Apple Music not connected"/"invalid") → surface Reconnect, not a crash; user revoked subscription mid-session.

Acceptance: a gated button greys out without subscription and shows the sheet on press; content-creation features fall back to TrackPicker when not connected.
```

### Prompt 0.3 — Music card primitives + 30s preview player
```
Goal: reusable presentational cards + a shared preview player used by every music message type.

Mobile:
- components/music/TrackCard.tsx, AlbumCard.tsx, PlaylistCard.tsx (pure presentational: artwork, title, subtitle, actions slot).
- hooks/usePreviewPlayer.ts on expo-audio: single global player (only one preview at a time across the whole chat list), play/pause, 30s scrubber, auto-stop, releases on unmount. 30s preview URLs are free/public — no subscription needed.
- Actions: "Add to library" (needs subscription → requireMusic), "Open in Apple Music" (deep link music://, always allowed).
- Wire these into a renderer registry components/chat/messageRenderers.tsx mapping messageType -> component; MessageBubble delegates to it (keeping its text path as TEXT renderer).

Acceptance: a TRACK message renders the card with a working 30s scrubber; only one preview plays at a time; "Add to library" greys without subscription.
```

---

# Phase 1 — Now-Playing + Live Status (cheapest big win)

### Prompt 1.1 — Now-playing presence broadcast
```
Goal: broadcast each user's current track to people who share a conversation with them, privacy-gated.

Backend:
- Add WS event NOW_PLAYING { userId, track | null } in WebSocketMessage.
- Source: MusicService.getCurrentlyPlayingByUserId. Poll per connected user on an interval (e.g. 20-30s) OR accept a client push NOW_PLAYING_UPDATE from the device that owns the session. Prefer client-push (device knows instantly) with a server throttle; fall back to poll for accuracy.
- Privacy: per-user setting share_now_playing (default ON for matches, configurable). Only fan out to conversation participants. Never broadcast if subscription/token absent (nothing to share).
- Store last-known now-playing in presence service so a freshly opened chat can request it (NOW_PLAYING_REQUEST -> reply).

Mobile:
- ChatProvider subscribes to NOW_PLAYING, keeps a Map<userId, track|null>.
- Settings toggle "Share what I'm listening to".

Edge cases: not connected -> never broadcast; paused vs playing (include isPlaying); rapid track switching throttle; user offline -> clear.

Acceptance: when A plays a song, B (sharing a chat with A) receives NOW_PLAYING within the throttle window; toggling privacy off stops it.
```

### Prompt 1.2 — Live status pill in chat header
```
Goal: chat header shows partner's live track.

Mobile (app/(home)/(match)/chat/[conversationId].tsx header):
- Below name/last-seen, render a compact pill when nowPlaying[otherUserId] exists: tiny art + "♫ Title — Artist". Animated marquee if long.
- Tap -> opens the TrackCard sheet (30s preview, add-to-library, open-in-Apple-Music) reusing Phase 0.3.
- Hide pill when null/paused/privacy-off.

Acceptance: pill appears/updates/disappears live; tap opens preview sheet.
```

### Prompt 1.3 — Now-playing share button in composer
```
Goal: one-tap inject current track as a TRACK card message.

Mobile (MessageComposer):
- Add a music note button (left of input). Enabled only when canShareNowPlaying.
- On tap: read own current track (MusicService now-playing via backend, or local now-playing if available), send a TRACK message (messageType=TRACK, payload=track). No copy-paste.
- If nothing playing -> open TrackPicker (manual). If not connected -> requireMusic.

Acceptance: tap with a song playing posts a track card instantly; with nothing playing opens picker.
```

### Prompt 1.4 — Ambient match banner
```
Goal: when both participants are live-listening to the same song/artist, show a celebratory banner.

Mobile:
- In ChatProvider/chat screen, compare own now-playing vs partner now-playing. On match (same songId, or same artistId for the looser variant), show an in-app banner via useNotificationBannerStore: "You're both vibing to <Song> right now". Debounce so it fires once per shared listening session.
- Optional: tap banner -> start a Listening Together room (Phase 7) if available.

Edge cases: avoid spam (one banner per match streak); clear when either stops.

Acceptance: playing the same track on both devices triggers exactly one banner.
```

---

# Phase 2 — Track / Album / Playlist card message types (foundation everything builds on)

### Prompt 2.1 — Send & render Track card
```
Goal: first-class TRACK message: send from now-playing, picker, or search; render rich.

Mobile:
- Sending: from composer music button (1.3), from a "+" attach menu, and from any track context ("Send to chat").
- Payload (TrackPayload): { catalogId, isrc?, title, artistName, albumName?, artworkUrl, previewUrl, durationMs, appleMusicUrl }.
- Rendering: messageRenderers TRACK -> TrackCard with usePreviewPlayer scrubber + actions. Threads/replies/reacts exactly like a text message (same wrapper, footer, long-press menu).

Backend: validate payload shape for TRACK; persist; fan out.

Acceptance: a track card sent by A renders identically for B, is replyable/reactable, preview works for both regardless of subscription.
```

### Prompt 2.2 — Album card
```
Goal: ALBUM message type.

- AlbumPayload { catalogId, title, artistName, artworkUrl, trackCount, appleMusicUrl }.
- AlbumCard render: art, title, artist, track count, "Open in Apple Music", "Save album" (requireMusic).
- Send from album screens + picker.

Acceptance: album card renders + saves (gated) + opens.
```

### Prompt 2.3 — Playlist card
```
Goal: PLAYLIST message type — share a whole playlist; recipient previews + saves.

- PlaylistPayload { catalogId | userPlaylistId, title, curatorName, artworkUrl, trackCount, appleMusicUrl, previewTrackIds? }.
- PlaylistCard: art collage, title, count, "Preview" (cycles 30s previews of first N), "Save playlist" (requireMusic), "Open".
- Edge: user-owned playlists may not be publicly shareable -> share catalog playlists; for personal playlists, share as a snapshot link or deny with explanation.

Acceptance: playlist card renders, previews first tracks, saves when subscribed.
```

---

# Phase 3 — WhatsApp parity baseline (do alongside Phase 2)

### Prompt 3.1 — Replies / threads
```
Backend: replyToId already on Message — ensure MessageResDto returns the referenced message stub (sender, snippet, type). Mobile: long-press -> Reply; render quoted preview above bubble (works for music cards too — show "♫ Track" snippet). Tap quote -> scroll to original.
```

### Prompt 3.2 — Reactions (emoji)
```
Backend: message_reactions table (messageId, userId, emoji, createdAt); WS REACTION_ADD/REMOVE; include reaction summary in MessageResDto. Mobile: long-press reaction bar; render reaction chips under bubble; optimistic. (Sets up Phase 4 "reaction = track".)
```

### Prompt 3.3 — Edit / delete
```
Backend: edit (content + edited flag, TEXT only), soft delete (isDeleted already). WS MESSAGE_EDIT/MESSAGE_DELETE. Mobile: long-press menu; render "deleted" tombstone + "edited" marker.
```

### Prompt 3.4 — Pinned messages
```
Backend: conversation_pins (conversationId, messageId, pinnedBy). WS PIN_ADD/REMOVE. Mobile: pin via menu; pinned bar under header; tap -> scroll. Music cards pinnable (sets up community pinned playlist Phase 6).
```

### Prompt 3.5 — Search
```
Backend: GET /conversations/{id}/messages/search?q= (content + card title/artist text). Mobile: in-chat search UI, highlight + jump.
```

### Prompt 3.6 — Mute
```
Backend: per-conversation mute (until timestamp). Suppress push (notification/ExpoPush) + in-app banner for muted convos. Mobile: mute menu + muted icon in list.
```

### Prompt 3.7 — Media (images) + link previews
```
Images: reuse existing media upload (MinIO) — IMAGE message type, mediaUrl. Link previews: backend OG fetch (already have public post-meta OG endpoint per deep-link work) -> LINK_PREVIEW payload; render card. Apple Music links auto-upgrade to TRACK/ALBUM/PLAYLIST cards by parsing the URL.
```

### Prompt 3.8 — Voice notes
```
Mobile: record with expo-audio, upload, VOICE message (mediaUrl + durationMs + waveform peaks in payload). Render waveform + play/scrub. (Base for Phase 4 "voice over beat".)
```

### Prompt 3.9 — Stickers
```
Goal: send stickers.

Backend: sticker_packs / stickers (id, packId, url, name) OR a fixed bundled set; STICKER message type (payload { stickerId, url }). Optionally allow custom uploaded stickers later.
Mobile: sticker picker tab in composer attach tray; render sticker as a borderless image bubble (no card chrome). Reactable/replyable.
Music twist (optional): "music stickers" — animated art of an artist/album that deep-links to it.

Acceptance: sticker picker sends a STICKER message; renders large, no bubble background; threads/reacts like any message.
```

---

# Phase 4 — Music-native message types

### Prompt 4.1 — Lyric snippet
```
Backend: lyrics endpoint via Apple time-synced lyrics (subscription-gated by Apple). If lyrics unavailable/no subscription -> manual paste fallback. LYRIC payload { trackRef, lines[], startTimeMs?, endTimeMs? }.
Mobile: from a track, pick 1-4 lyric lines -> styled quote card (big type, artist attribution, art background). Tap -> open track at lyric timestamp (Phase 4.2).
Gating: time-synced lyrics need subscription -> else manual lyric entry; never block sending.
```

### Prompt 4.2 — Timestamp drop
```
Goal: "listen from 1:24" deep link.
TIMESTAMP payload { trackRef, positionMs }. Render card "Listen from 1:24". Tap -> open Apple Music at position if supported, else open track + preview from nearest 30s window. Compose via a time picker on any track card.
```

### Prompt 4.3 — Song dedication
```
DEDICATION = TRACK payload + { dedication: true, note? }. Special card style (heart accent, "This made me think of you", optional note). Send flow: pick track -> "Dedicate" -> optional note.
```

### Prompt 4.4 — Voice note over beat
```
Extend VOICE: optional bed track. Record voice + pick a low-volume backing (catalog 30s preview or bundled royalty-free beats to avoid Apple ToS issues for full tracks). Mix locally (expo-audio) before upload, OR store both refs and mix on playback. Prefer bundled/royalty-free beds for licensing safety; Apple catalog previews only as a stylistic clip, documented as such.
```

### Prompt 4.5 — Reaction = track
```
Extend reactions (3.2): allow reacting with a track instead of emoji. Reaction value can be { type:'emoji'|'track', ... }. Render a mini track chip under the message; tap -> preview. Picker via TrackPicker.
```

### Prompt 4.6 — Blind listen (game)
```
BLIND_LISTEN = TRACK payload + { hidden:true, guessed:false }. Render with art blurred + artist/title hidden, only preview playable. Recipient taps "Guess" -> input -> reveal (fuzzy match artist/title) -> card flips to normal + shows correct/incorrect. Track score optionally. State transitions over WS (reveal event) so both sides update.
```

---

# Phase 5 — Social / ambient

### Prompt 5.1 — Taste handshake (priority)
```
Goal: on a new match, auto-post an icebreaker card of shared artists/genres.

Backend: on conversation create from a match (requestStatus accepted or first message), compute shared artists/genres from existing genre/top-artist data (MusicService.getTopArtistsByUserId + stored genres) for both users. Insert a SYSTEM/TASTE_HANDSHAKE message with payload { sharedArtists[], sharedGenres[], overlapScore }.
Mobile: TASTE_HANDSHAKE renderer — "You both love <Artist>, <Artist> + 2 more". CTAs: "Send a song by <Artist>" (-> picker prefiltered), "See their profile".
Edge: no overlap -> friendly fallback ("You both have eclectic taste — break the ice"). One per conversation, idempotent.

Acceptance: first opening a new match shows the handshake card seeded from real genre data.
```

### Prompt 5.2 — Daily song (ephemeral, status-style)
```
Backend: daily prompt + ephemeral store (expires 24h). User picks a top track -> visible to matches/communities as a status, not a permanent message. Reactions allowed; auto-expire job (reuse retention job pattern from push work).
Mobile: status tray at top of chat list (WhatsApp status style); compose from getTopTracks; view others' daily songs with preview.
```

---

# Phase 6 — Group / community chat

> Requires conversations to support groups (`isGroup`, `groupName` exist on Conversation). Confirm group send/fan-out works before these.

### Prompt 6.1 — Collab playlist in thread
```
Backend: community conversation gets a backing playlist (server-built). Members add tracks from chat -> appended; build/refresh an Apple catalog playlist or an internal playlist entity. Pinned (reuse 3.4) COLLAB_PLAYLIST card showing live track count.
Mobile: "Add to playlist" on any track card in the thread; pinned playlist card with preview + "Save to my library".
```

### Prompt 6.2 — Listening party (scheduled group sync)
```
Backend: party entity { conversationId, hostId, startAt, trackOrPlaylist }. Scheduled; at start emit PARTY_START. Sync = position-only (see Phase 7 legality). Thread becomes live reaction feed.
Mobile: schedule UI, countdown, join -> sync-play (own stream), floating reactions in thread.
```

### Prompt 6.3 — Now-playing roster
```
Reuse NOW_PLAYING (1.1) fanned to community members. Member list / sidebar shows who's listening to what live, privacy-gated. Tap a member's track -> preview.
```

### Prompt 6.4 — Song of the week vote
```
Backend: weekly poll per community; members drop TRACK candidates; reactions = votes; at week end pin winner (3.4) + post recap. Schedule via cron job.
Mobile: candidates list, vote, winner banner.
```

---

# Phase 7 — Listening Together (sync) — hardest, legality-sensitive

### Prompt 7.1 — Sync-play room (position only, no audio relay)
```
LEGAL CONSTRAINT (must honor): Apple Music ToS forbids relaying audio or sharing one stream. Each participant plays from THEIR OWN Apple Music subscription. We sync only PLAYBACK POSITION + play/pause/track-change events. No audio bytes ever cross the wire.

Backend: room entity { conversationId, hostId, trackRef, positionMs, isPlaying, updatedAt }. WS events ROOM_JOIN, ROOM_STATE (host heartbeat ~ every 2-3s + on change), ROOM_LEAVE. Host is the clock; followers correct drift toward host position.
Mobile:
- Both must be connected + subscribed (canPlayFull). If not -> 30s-preview "lite room" (everyone plays the same 30s preview in sync, which IS allowed) OR disable with upsell.
- Drift correction: if |localPos - hostPos| > ~1.5s, seek. Debounce seeks. Handle buffering, track end, host leaves (promote or end).
- Floating reactions over the now-playing track (animated, ephemeral, broadcast via WS REACTION_FLOAT).

Edge cases: a follower lacks the track in their region/catalog -> show "unavailable for you", keep them in preview mode; network jitter; host backgrounds the app.

Acceptance: two subscribed devices stay within ~1.5s of each other; non-subscribers get the preview-sync fallback or a clear upsell; no audio is ever proxied.
```

---

## Capability matrix (quick reference)

| Feature | No Apple connection | Connected, no subscription | Subscribed |
|---|---|---|---|
| Live status pill / now-playing broadcast | hidden | hidden (nothing to read) | full |
| Share now-playing | picker (manual) | picker | one-tap live |
| Track/Album/Playlist card send | manual via catalog search | yes | yes |
| 30s preview playback | yes (public) | yes | yes |
| Add to library / Save | greyed → upsell | greyed → upsell | yes |
| Open in Apple Music | yes (deep link) | yes | yes |
| Lyric snippet (time-synced) | manual paste | manual paste | full lyrics |
| Listen Together (full) | upsell/disabled | preview-sync lite | full sync |
| Daily song / taste handshake | uses stored top data | uses stored top data | live top data |

## Global edge cases to assert in every phase
- Apple token expired/invalid → MusicService throws; surface **Reconnect**, never crash.
- Offline → cards still render from cached payload; actions queue or disable.
- Region/catalog gaps → "unavailable in your region", keep preview where possible.
- Unknown messageType (old client) → graceful "update the app" bubble.
- Privacy: now-playing + roster + daily song all respect a share toggle, default scoped to matches/community only.
- Licensing: never relay audio; bed tracks for voice-over prefer bundled royalty-free; full playback always from the user's own subscription.
