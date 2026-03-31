# web/src/types/

Shared TypeScript type definitions.

## Files

### `chat.ts`
Core chat types:
- `Participant` — userId, username, displayName, profileImage, lastReadAt, lastSeenAt
- `Conversation` — id, isGroup, groupName, participants[], requestStatus (`ACCEPTED`|`PENDING_INCOMING`|`PENDING_OUTGOING`), lastMessage, unreadCount, timestamps
- `Message` — id, conversationId, senderId, content, messageType, isDeleted, replyToId, createdAt; client-only: `tempId` (optimistic), `status` (`sending`|`sent`|`failed`)
- `PresenceStatus` — `"online"` | `"offline"`
- `WsMessagePayload` — union payload for all WS event types (presence, message, typing, read)
- `WsInbound` — `{ type: string, payload: Record<string, unknown> }`
- `WsOutbound` — `{ type: string, payload?, conversationId?, content?, tempId? }`

### `match.ts`
- `SuggestedUser` — user recommendation with compatibility score, matched artists/genres, user profile data
- `UserMatch` — match record with status (`ACTIVE`|`UNMATCHED`|`USER_A_HIDDEN`|`USER_B_HIDDEN`), matchedAt, user info
- `LikeResponse` — response from likeUser() API: `matched: boolean`, match data if mutual
- `SentLike` — pending outgoing like with timestamp and target user

### `profile.ts`
- `ProfileCustomization` — full profile state: displayName, bio, country, bannerUrl, accentColor, nameColor, tags, topSongs, topArtists, topAlbums, currentlyListening, showLastRatedAlbum, widget colors/sizes/order, spotifySynced flags, hiddenWidgets
