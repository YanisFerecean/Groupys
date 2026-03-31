# web/src/app/album/

Album detail page with rating system.

## Files

| File | Purpose |
|---|---|
| `layout.tsx` | Album layout wrapper (shared nav/shell) |
| `[id]/page.tsx` | Dynamic album detail page — renders `AlbumRatingPage` component |

## Data Flow

Route param `[id]` is a Deezer album ID (numeric). Page fetches album metadata from backend, then renders the rating/review UI.

## Dependencies
- Internal: [AlbumRatingPage](../../components/album.md)
