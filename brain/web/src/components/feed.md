# web/src/components/feed/

Social feed components.

## Files

### `FeedContent.tsx`
Main feed post list with cursor-based pagination (20 per page). Fetches from `/api/posts/feed`. Renders post cards with author info, content preview, media thumbnails, reaction counts, comment counts, relative time.
- **Types defined locally**: `PostRes`, `PostMedia`
- **Helper**: `timeAgo()` for relative time formatting

### `FeedHeroCard.tsx`
Large featured post card at top of feed — editorial/highlighted content.

### `FeedEditorialCard.tsx`
Styled card for editorial content (curated articles, announcements).

### `FeedSidebar.tsx`
Right sidebar with trending content, suggested communities, and suggested users.

### `PlayerBar.tsx`
Fixed footer music player bar. Placeholder UI: track info, play/pause/skip controls, progress bar, volume slider. Pure presentation (no actual playback logic yet).
