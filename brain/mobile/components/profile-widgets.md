# mobile/components/profile/widgets/

Profile widgets for the mobile widget grid.

## Files

| File | Purpose |
|---|---|
| `CurrentlyListeningWidget.tsx` | Now-playing track (Spotify-synced or manual). Track title, artist, cover art |
| `TopAlbumsWidget.tsx` | User's top albums grid with cover art |
| `TopArtistsWidget.tsx` | User's top artists grid with images |
| `TopSongsWidget.tsx` | User's top songs list with track/artist/cover |

## Notes
- Mirrors the web widget set but missing `LastRatedAlbumWidget` (web-only for now)
- Widget data comes from `ProfileCustomization` model
- Spotify-synced widgets auto-populate from Spotify API data
