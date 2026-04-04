# backend/.../client/

MicroProfile REST Clients for external music APIs.

## Files

### `DeezerClient.java`
**Base URL**: `https://api.deezer.com`
- `searchArtists(query)` → `DeezerArtistSearchResponse`
- `searchAlbums(query)` → `DeezerAlbumSearchResponse`
- `searchTracks(query)` → `DeezerTrackSearchResponse`
- `getArtistById(id)` → `DeezerArtistDto`
- `getAlbumById(id)` → `DeezerAlbumDto`
- `getArtistTopTracks(artistId)` → track list
- `getGenres()` → `DeezerGenreListResponse`

No authentication required.

### `LastFmClient.java`
**Base URL**: `https://ws.audioscrobbler.com/2.0/`
- Artist info, chart/top data, geo-based queries
- All requests require `LASTFM_API_KEY` env var as query parameter

### `SpotifyApiClient.java`
**Base URL**: `https://api.spotify.com/v1`
- `getTopArtists(token, timeRange, limit)` — user's top artists
- `getTopTracks(token, timeRange, limit)` — user's top tracks
- `getRecentlyPlayed(token, limit)` — recently played
- `getCurrentlyPlaying(token)` — now-playing track
- All requests use user's OAuth Bearer token

### `SpotifyAuthClient.java`
**Base URL**: `https://accounts.spotify.com`
- `exchangeCode(code, redirectUri, clientId, clientSecret)` — authorization code → tokens
- `refreshToken(refreshToken, clientId, clientSecret)` — refresh expired tokens
- Uses client credentials (Basic auth or form params)
