# backend/.../dto/

Data transfer objects. Java records for external API responses, classes for internal REST responses.

## Internal Response DTOs (17+)

| DTO | Purpose |
|---|---|
| `UserResDto` | User profile with follower/following counts |
| `CommunityResDto` | Community details |
| `CommunityMemberResDto` | Community member with role |
| `PostResDto` | Post with reactions, media |
| `CommentResDto` | Comment response |
| `MessageResDto` | Direct message |
| `ConversationResDto` | Conversation with participants |
| `MatchResDto` | Mutual match response |
| `SentLikeResDto` | Pending like |
| `FriendResDto` | Friend/follower |
| `FriendStatusDto` | Friend status (pending/blocked) |
| `AlbumResDto` | Album with artist and tracks |
| `ArtistResDto` | Artist with listeners/playcount |
| `TrackResDto` | Track with album/artist |
| `TopAlbumResDto`, `TopArtistResDto`, `TopTrackResDto` | Items in top lists |
| `AlbumRatingResDto` | User's album rating |

## Request DTOs (8)

| DTO | Purpose |
|---|---|
| `UserCreateDto` | User registration payload |
| `UserUpdateDto` | User profile update |
| `CommunityCreateDto` | Community creation |
| `CommunityUpdateDto` | Community update |
| `CommentCreateDto` | Comment creation |
| `AlbumRatingCreateDto` | Album rating creation |
| `DiscoveryActionDto` | Like/pass/dismiss action |
| `ParticipantDto` | Conversation participant |

## Discovery & Match DTOs (7+)

| DTO | Purpose |
|---|---|
| `SuggestedUserResDto` | Suggested user with similarity score |
| `SuggestedCommunityResDto` | Suggested community |
| `DiscoveryMatchDto` | Match candidate details |
| `DiscoverySyncResDto` | Music sync status |
| `SearchResDto` | Unified search results |
| `LikeResponseDto` | Like action response (mutual match indicator) |
| `UserFollowResDto` | Follow action response |

## External API DTOs

### Deezer (`dto/deezer/`)
| DTO | Purpose |
|---|---|
| `DeezerArtistDto` / `DeezerArtistSearchResponse` | Artist data/search results |
| `DeezerAlbumDto` / `DeezerAlbumSearchResponse` | Album data/search results |
| `DeezerTrackDto` / `DeezerTrackSearchResponse` | Track data/search results |
| `DeezerGenreDto` / `DeezerGenreListResponse` | Genre data |

### Last.FM (`dto/lastfm/`)
| DTO | Purpose |
|---|---|
| `LastFmTopArtistsResponse` | Top artists endpoint |
| `LastFmChartArtistsResponse` / `LastFmChartTracksResponse` | Chart data |
| `LastFmArtistInfoResponse` | Artist bio/info |
| `LastFmTagAlbumsResponse` | Albums by tag |
| `LastFmGeoTracksResponse` | Tracks by geo location |

### Spotify (`dto/spotify/`)
| DTO | Purpose |
|---|---|
| `SpotifyTopArtistsResponse` / `SpotifyTopTracksResponse` / `SpotifyRecentlyPlayedResponse` | User data |
| `SpotifyCurrentlyPlayingResponse` | Now-playing |
| `SpotifyTokenResponse` | OAuth token exchange |
| `SpotifyImage` | Image object |
| `SpotifyAlbumResDto`, `SpotifyArtistResDto`, `SpotifyTrackResDto` | Mapped response DTOs |
