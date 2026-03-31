# backend/.../service/

Business logic layer. 32+ services.

## Core Services

### `UserService`
User CRUD: `listAll()`, `getById()`, `getByUsername()`, `getByClerkId()`, `search()`, `create()`, `update()`, `delete()`.

### `CommunityService`
Community management: `listAll()`, `search()`, `getJoinedCommunities()`, `getTrending()`, `getById()`, `getByName()`, `getByGenre()`, `getByCountry()`, `getByArtist()`, `create()`, `update()`, `join()`, `leave()`, `getMembers()`, `isMember()`, `isOwner()`.

### `PostService`
Post CRUD & feed: `getFeed()` (paginated from joined communities), `getByCommunity()`, `getAccountPosts()`, `getByAuthor()`, `getById()`, `create()` (multipart with media processing), `react()` (like/dislike toggle), `delete()`.

### `CommentService`
Comment CRUD on posts with reactions.

### `ChatService`
Direct messaging: `getConversationsPaged()`, `getConversation()`, `getOrCreateDirectConversation()`, `acceptConversationRequest()`, `denyConversationRequest()`, `getMessages()` (paginated), `sendMessage()`, `deleteMessage()`, `markRead()`.

### `FriendshipService`
User follow/friendship management.

## Discovery & Matching

### `DiscoveryService`
Music taste-based recommendations: `syncMusic()` (pulls from Spotify), `getSuggestedUsers()`, `getSuggestedCommunities()`, `dismissRecommendation()`, `followUser()`. Manages `UserTasteProfile`, `UserArtistPreference`, `UserGenrePreference`, `UserDiscoveryAction`. Uses pgvector cosine similarity for embedding-based scoring.

### `MatchService`
Dating/friendship matching: `getMatches()`, `getMatchHistory()`, `getPendingSentLikes()`, `likeUser()`, `withdrawLike()`, `passUser()`, `unmatch()`. Mutual-like detection creates `UserMatch` records.

### `TasteEmbeddingService`
Builds user taste embeddings from music preferences for pgvector similarity search.

## External Integration

### `SpotifyService`
OAuth flow: `buildAuthorizationUrl()`, `handleCallback()`, token refresh. Data: `getTopArtists()`, `getTopTracks()`, `getRecentlyPlayed()`.

### `ArtistService`
Artist metadata: fetch/cache from Deezer + Last.FM, genre enrichment.

### `AlbumService` / `TrackService`
Album/track metadata: fetch/cache from Deezer.

### `ChartService`
Chart data (top tracks/artists) from Last.FM.

### `SearchService`
Unified search across users, communities, artists, albums, tracks.

## Infrastructure Services

### `StorageService`
MinIO file upload/download: `uploadToBucket()`, `uploadPostMedia()`, URL generation.

### `MediaService`
Media processing before MinIO upload:
- `processImage(InputStream, contentType)` → resizes to max 2048px, re-encodes as JPEG 85% (uses Thumbnailator, pure Java)
- `processVideo(Path)` → transcodes to H.264/AAC MP4 via FFmpeg subprocess; output → `video/mp4`
- `processAudio(Path)` → re-encodes to AAC 128k M4A via FFmpeg subprocess; output → `audio/mp4`

**FFmpeg requirement**: `ffmpeg` must be on PATH. Both subprocess methods discard stdout/stderr (`ProcessBuilder.Redirect.DISCARD`) to prevent pipe-buffer deadlock — FFmpeg writes continuous progress output which would otherwise block `waitFor()`. Non-zero exit code throws `RuntimeException`.

### `ChatRedisStateService`
Redis caching for chat state optimization (unread counts, last message previews).

### `PresenceService`
User presence tracking via WebSocket broadcast.

### `DiscoveryRedisCacheService`
Redis caching for suggested users/communities.

### `PgVectorSupport`
pgvector extension initialization for similarity search.

### `RedisSupport`
Redis connection/utility methods.

## Background Jobs (Scheduled)

| Job | Purpose |
|---|---|
| `DiscoveryRefreshJob` | Periodically refreshes recommendation cache |
| `DiscoveryRedisWarmupJob` | Pre-warms Redis discovery cache on startup |
| `EmbeddingBackfillJob` | Backfills taste embeddings for existing users |
| `MusicSnapshotBackfillJob` | Snapshots user music taste history |
| `ReadModelReconciliationJob` | Reconciles cached counts (likes, comments) with DB |

## Utility Services

### `AlbumRatingService`
User album rating CRUD.

### `CountryService` / `GenreService`
Country and genre list management.
