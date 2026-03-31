# backend/.../resource/

JAX-RS REST endpoints. All under `/api` prefix. Secured with SmallRye JWT (Clerk tokens).

## Files

| Resource | Path | Key Endpoints |
|---|---|---|
| `UserResource` | `/api/users` | `GET /` list, `GET /{id}`, `GET /username/{u}`, `GET /clerk/{clerkId}`, `GET /search?q=`, `POST /` create, `PUT /{id}` update, `POST /{id}/follow`, `DELETE /{id}` |
| `CommunityResource` | `/api/communities` | `GET /`, `GET /search?q=`, `GET /mine`, `GET /trending`, `GET /{id}`, `GET /name/{name}`, `GET /genre/{g}`, `GET /country/{c}`, `GET /artist/{id}`, `POST /` create, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/join`, `POST /{id}/leave`, `GET /{id}/members`, `POST /{id}/banner` (multipart), `POST /media/upload` (multipart) |
| `PostResource` | `/api/posts` | `GET /feed` (paginated), `GET /mine`, `GET /author/{userId}`, `GET /{id}`, `GET /community/{id}` (paginated), `POST /community/{id}` (multipart with media), `POST /{id}/react`, `DELETE /{id}`, `GET /media/{key:.+}` (range request for video streaming) |
| `CommentResource` | `/api/comments` | Comment CRUD + reactions on posts |
| `AlbumResource` | `/api/albums` | Album search and retrieval (Deezer-backed) |
| `ArtistResource` | `/api/artists` | Artist search + top tracks |
| `TrackResource` | `/api/tracks` | Track search and retrieval |
| `AlbumRatingResource` | `/api/album-ratings` | `POST /` upsert, `GET /album/{id}`, `GET /mine`, `GET /user/{username}`, `DELETE /{id}` |
| `ConversationResource` | `/api/chat` | `GET /conversations` (cursor-paginated), `GET /conversations/{id}`, `POST /conversations` start, `POST /conversations/{id}/accept`, `DELETE /conversations/{id}/request`, `GET /conversations/{id}/messages` (paginated), `POST /conversations/{id}/messages`, `DELETE /messages/{id}`, `PUT /conversations/{id}/read`, `GET /keys/{username}` (E2E public key), `PUT /keys/me` |
| `MatchResource` | `/api/matches` | `GET /` list, `GET /history` (paginated), `GET /sent-likes`, `GET /{matchId}`, `DELETE /{matchId}` unmatch |
| `DiscoveryResource` | `/api/discovery` | `GET /communities/suggested`, `GET /users/suggested`, `POST /recommendations/{type}/{id}/dismiss`, `POST /users/{id}/like`, `DELETE /users/{id}/like`, `POST /users/{id}/pass`, `POST /music/sync` |
| `FriendshipResource` | `/api/friendships` | Follow/unfollow, friends list, pending requests |
| `SearchResource` | `/api/search` | `GET /?q=` unified search across users, communities, artists, albums, tracks |
| `ChartResource` | `/api/charts` | Trending artists/tracks from Last.FM |
| `GenreResource` | `/api/genres` | Genre list |
| `CountryResource` | `/api/countries` | Country list |
| `SpotifyResource` | `/api/spotify` | `GET /auth-url`, `POST /callback` (mobile), `GET /callback` (web), `GET /top-artists`, `GET /top-tracks`, `GET /recently-played` |

## Notes
- User identity resolved from JWT `sub` claim (Clerk user ID)
- Multipart uploads for community banners, post media; max 4 files, 25 MB each
- Video streaming via HTTP range requests (`GET /media/{key:.+}`)
- **Post media upload pipeline** (`POST /community/{id}`): images → Thumbnailator resize; video/audio → FFmpeg transcode with raw-file fallback if FFmpeg is unavailable or fails; unknown types → raw upload. Max body size: 100 MB (configured in `application.properties`)
- **Error responses**: file upload failures return `{"error": "<message>"}` with HTTP 500 (not a thrown exception) so clients can read the real error
