# web/src/components/album/

Album rating components.

## Files

### `AlbumRatingPage.tsx`
Full album rating flow. Displays album cover, title, artist, tracklist. Users can rate (1-5 score) and write a text review. Shows other users' ratings for the same album.
- **API calls**: `upsertAlbumRating()`, `fetchAlbumRatings()`, `fetchMyAlbumRatings()`, `deleteAlbumRating()`
- **Data**: Album metadata fetched by Deezer ID from backend

## Dependencies
- Internal: [api.ts](../../lib.md) (album rating functions)
