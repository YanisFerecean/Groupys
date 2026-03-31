# web/src/api/

Client-side external music API wrappers (called from browser or server components).

## Files

### `deezer.ts`
Deezer API search functions (public API, no auth key).
- **Types**: `DeezerTrack`, `DeezerArtist`, `DeezerAlbum`
- **Functions**: `resolveArtistImage(artistName)` — fetches artist photo from Deezer free search API

### `lastfm.ts`
Last.fm API functions.
- **Types**: `LastFmArtist`, `LastFmArtistRaw`
- **Functions**: `getTopArtists(count)` — fetches top artists from Last.FM chart API
- **Env**: Requires `LASTFM_API_KEY`
