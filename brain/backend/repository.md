# backend/.../repository/

Data access layer using Quarkus Panache (`PanacheRepositoryBase<Entity, ID>`). 31+ repositories.

## Key Repositories

### User & Profile
| Repository | Entity | Key Queries |
|---|---|---|
| `UserRepository` | User | `findByClerkId()`, `findByUsername()`, `searchByUsernameOrDisplayName()` |
| `UserTasteProfileRepository` | UserTasteProfile | `findByUser()`, embedding status queries |
| `UserArtistPreferenceRepository` | UserArtistPreference | Taste component lookups |
| `UserGenrePreferenceRepository` | UserGenrePreference | Taste component lookups |
| `UserTrackPreferenceRepository` | UserTrackPreference | Taste component lookups |
| `UserFollowRepository` | UserFollow | `findFollowers()`, `findFollowing()`, `countFollowers()`, `countFollowing()`, status checks |
| `FriendshipRepository` | Friendship | `findByFollower()`, `findByFollowing()` |

### Discovery & Matching
| Repository | Entity | Key Queries |
|---|---|---|
| `UserDiscoveryActionRepository` | UserDiscoveryAction | `findByUserAndAction()`, dismissed/liked/passed filters |
| `UserLikeRepository` | UserLike | `findByLiker()`, `findByLiked()`, `findByLikerAndLiked()` |
| `UserMatchRepository` | UserMatch | `findByUser()` (paginated), `findExisting()`, `findSentLikes()`, mutual match queries |
| `UserSimilarityCacheRepository` | UserSimilarityCache | `findByUserPair()`, invalidation |
| `MusicSourceSnapshotRepository` | MusicSourceSnapshot | `findByUser()`, `findLatestByUser()` |

### Chat
| Repository | Entity | Key Queries |
|---|---|---|
| `ConversationRepository` | Conversation | `findByUser()`, `findByUserPaged()` (cursor), `findByParticipants()` (direct lookup) |
| `MessageRepository` | Message | `findByConversation()` (paginated), `findLatest()` |

### Community
| Repository | Entity | Key Queries |
|---|---|---|
| `CommunityRepository` | Community | `findByName()`, `findByGenre()`, `findByCountry()`, `findByArtist()`, `search()`, `getTrending()` |
| `CommunityMemberRepository` | CommunityMember | `findByUser()`, `findByUserLimited()`, `findByCommunity()`, `findTrendingCommunityIds()` |
| `CommunityTasteProfileRepository` | CommunityTasteProfile | Taste snapshot lookups |
| `CommunityRecommendationCacheRepository` | CommunityRecommendationCache | Cache lookups/invalidation |
| `CommunityArtistRepository` | CommunityArtist | Featured artist lookups |
| `CommunityGenreRepository` | CommunityGenre | Featured genre lookups |

### Content
| Repository | Entity | Key Queries |
|---|---|---|
| `PostRepository` | Post | `findByCommunitiesPaged()`, `findByCommunityPaged()`, `findByAuthorPaged()`, `findByAuthor()`, `getFeed()` |
| `PostReactionRepository` | PostReaction | `findByPostAndUser()`, `countLikes()`, `countDislikes()` |
| `CommentRepository` | Comment | `findByPost()`, `findByAuthor()`, `countByPost()` |
| `CommentReactionRepository` | CommentReaction | Like/dislike queries |
| `AlbumRatingRepository` | AlbumRating | `findByUser()`, `findByUserAndAlbum()`, stats queries |

### Music
| Repository | Entity | Key Queries |
|---|---|---|
| `ArtistRepository` | Artist | `findByName()`, `findBySpotifyId()`, `search()`, `findWithGenres()` |
| `AlbumRepository` | Album | `findByArtist()`, `search()` |
| `TrackRepository` | Track | `findByAlbum()`, `findByArtist()`, `search()` |
| `GenreRepository` | Genre | Lookup by name |
| `ArtistGenreRepository` | ArtistGenre | `findByArtist()` |
| `CountryRepository` | Country | Lookup by code/name |
