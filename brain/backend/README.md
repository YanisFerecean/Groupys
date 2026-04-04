# backend/quarkus-groupys/

Quarkus 3.32.4 REST API. Java 25, Maven. All source under `src/main/java/com/groupys/`.

## Architecture

```
Resource (JAX-RS) → Service → Repository (Panache) → PostgreSQL
                 ↘ External Client (Deezer/LastFM/Spotify)
                 ↘ Redis (cache, presence, WS state)
                 ↘ MinIO (media storage)
```

## Packages

### `resource/` — REST endpoints (all under `/api`)

| Resource | Path | Purpose |
|---|---|---|
| `UserResource` | `/api/users` | CRUD, search, Clerk ID lookup |
| `AlbumRatingResource` | `/api/album-ratings` | Create/update/delete ratings |
| `AlbumResource` | `/api/albums` | Album lookup (Deezer-backed) |
| `ArtistResource` | `/api/artists` | Artist lookup + top tracks |
| `TrackResource` | `/api/tracks` | Track lookup |
| `CommunityResource` | `/api/communities` | CRUD, membership, search |
| `PostResource` | `/api/posts` | CRUD, reactions |
| `CommentResource` | `/api/comments` | CRUD, reactions |
| `ConversationResource` | `/api/conversations` | Conversation list, create, mark-read |
| `ChatResource` | `/api/chat` | Message history, send, delete |
| `MatchResource` | `/api/matches` | Like/pass, history |
| `DiscoveryResource` | `/api/discovery` | User recommendations queue |
| `FriendshipResource` | `/api/friendships` | Follow/unfollow, friends list |
| `SearchResource` | `/api/search` | Cross-entity search |
| `ChartResource` | `/api/charts` | Trending artists/tracks (LastFM) |
| `GenreResource` | `/api/genres` | Genre list |
| `CountryResource` | `/api/countries` | Country list |
| `SpotifyResource` | `/api/spotify` | OAuth + top tracks/artists |

### `service/` — Business logic (32 services)

Key services:
- `MatchService` — mutual-like detection, match creation
- `DiscoveryService` — recommendation scoring using pgvector similarity
- `TasteEmbeddingService` — builds user taste embeddings from music preferences
- `ChatService` / `ChatRedisStateService` — message storage + Redis-backed presence/typing
- `CommunityService` — member management, taste profile aggregation
- `StorageService` / `MediaService` — MinIO upload/download
- `SpotifyService` — token management + data sync

Background jobs:
- `DiscoveryRefreshJob` — periodically refreshes recommendation cache
- `DiscoveryRedisWarmupJob` — pre-warms Redis discovery cache on startup
- `EmbeddingBackfillJob` — backfills taste embeddings for existing users
- `MusicSnapshotBackfillJob` — backfills music data snapshots
- `ReadModelReconciliationJob` — reconciles cached read models with DB

### `model/` — JPA entities (36 entities)

Entity IDs come from external APIs (Deezer/Spotify) — **no `@GeneratedValue`** on music entities; UUIDs used for social entities.

Key entity groups:
- **Music:** `Artist`, `Album`, `Track`, `Genre`, `ArtistGenre`
- **Users:** `User`, `UserArtistPreference`, `UserGenrePreference`, `UserTrackPreference`, `UserTasteProfile`
- **Social:** `Friendship`, `UserFollow`, `UserLike`, `UserMatch`
- **Chat:** `Conversation`, `ConversationParticipant`, `Message`
- **Community:** `Community`, `CommunityMember`, `CommunityArtist`, `CommunityGenre`, `CommunityTasteProfile`, `CommunityRecommendationCache`
- **Content:** `Post`, `PostMedia`, `PostReaction`, `Comment`, `CommentReaction`
- **Cache:** `UserSimilarityCache`, `MusicSourceSnapshot`, `UserDiscoveryAction`

### `dto/` — Data transfer objects

Java records for external API responses (Deezer*, LastFm*, Spotify*). Plain classes for internal response DTOs (`*ResDto`).

### `client/`
REST clients for external music APIs:
- `DeezerClient` — track/album/artist/genre/search
- `LastFmClient` — charts (trending artists/tracks), artist info, tag albums, geo tracks
- `SpotifyApiClient` / `SpotifyAuthClient` — currently-playing, top artists/tracks, auth

### `websocket/`
- `ChatWebSocket` — Quarkus WebSocket endpoint at `/api/ws/chat`
- `WebSocketMessage` — message envelope (type + JSON payload)

Protocol: client sends `AUTH {token}` → server responds `AUTH_OK` → client sends `SYNC` on reconnect. Message types: `MESSAGE_SEND`, `MESSAGE_NEW`, `MESSAGE_DELETED`, `TYPING_START`, `TYPING_STOP`, `PRESENCE_UPDATE`, `MARK_READ`.

### `config/`
- `PerformanceFeatureFlags` — runtime flags for enabling/disabling expensive features
- `RedisHealthCheck` — custom health check for Redis
- `SchemaBootstrapService` — seeds genres and countries on startup
- `OpenApiSecurityConfig` — adds JWT bearer scheme to Swagger UI

### `util/`
- `DiscoveryScoreUtil` — taste similarity scoring algorithm
- `MusicIdentityUtil` — normalizes artist/track identifiers across APIs
- `UserUtil` / `CommunityUtil` / `CountryUtil` — shared helpers
- `CountrySeed` / `GenreSeed` — static seed data

## Authentication

All endpoints secured with SmallRye JWT. Clerk issues JWTs; backend validates them. User identity resolved from JWT `sub` claim (Clerk user ID).

## Detailed Docs

- [resource.md](resource.md) — All REST endpoints with paths
- [service.md](service.md) — Business logic (32+ services, background jobs)
- [model.md](model.md) — JPA entities (36 entities, relationships, ID strategy)
- [dto.md](dto.md) — DTOs (response, request, external API)
- [repository.md](repository.md) — Panache data access (31+ repos)
- [client.md](client.md) — External API clients (Deezer, LastFM, Spotify)
- [websocket.md](websocket.md) — Chat WebSocket endpoint + protocol
- [config.md](config.md) — App config, feature flags, schema bootstrap
- [util.md](util.md) — Scoring, identity, seed data helpers
- [mapper.md](mapper.md) — Entity ↔ DTO mappers

## Notes

- pgvector used for cosine similarity on taste embeddings (recommendation engine).
- Redis used for: presence state, typing indicators, discovery cache, WS session tracking.
- MinIO used for: profile images, post media, community images.
