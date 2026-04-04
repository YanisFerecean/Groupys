# backend/.../mapper/

Entity ↔ DTO conversion mappers.

## Files

### `AlbumMapper.java`
- `DeezerAlbumDto` → `Album` entity (for persisting Deezer data)
- `Album` entity → `AlbumResDto` (for REST responses)

### `ArtistMapper.java`
- `DeezerArtistDto` → `Artist` entity
- `Artist` entity → `ArtistResDto` (merges Deezer + Last.FM data: name, images, listeners, playcount, summary)

### `TrackMapper.java`
- `DeezerTrackDto` → `Track` entity
- `Track` entity → `TrackResDto`

## Notes
- Only music entities have dedicated mappers (external API → entity → response)
- Social entities (User, Community, Post, etc.) are mapped inline in `UserUtil`, `CommunityUtil`, or directly in services
