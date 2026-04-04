# backend/.../model/

JPA entities. 36 entities total. Private fields with getters/setters.

## ID Strategy
- **Music entities** (Album, Artist, Track, Genre): `Long` IDs from Deezer — **no `@GeneratedValue`**
- **Social entities** (User, Community, Post, etc.): UUID with `@GeneratedValue`

## Entity Groups

### Users
| Entity | Key Fields | Relationships |
|---|---|---|
| `User` | clerkId (unique), username, displayName, bio, country, countryCode, profileImage, bannerUrl, accentColor, nameColor, widgets (JSON), spotifyAccessToken/RefreshToken/Expiry, publicKey (ECDH P-256), lastMusicSyncAt, tasteSummaryText, recommendationOptOut, discoveryVisible | — |
| `UserTasteProfile` | topArtists/topTracks/topGenres (JSON), embeddingStatus (NONE/PENDING/READY), embedding (pgvector) | OneToOne → User |
| `UserArtistPreference` | weight (normalized score) | ManyToOne → User, Artist |
| `UserGenrePreference` | weight | ManyToOne → User, Genre |
| `UserTrackPreference` | weight | ManyToOne → User, Track |
| `UserDiscoveryAction` | targetType (USER/COMMUNITY), targetId, action (LIKED/PASSED/DISMISSED) | ManyToOne → User |
| `UserSimilarityCache` | similarityScore, computedAt | ManyToOne → User (x2) |
| `MusicSourceSnapshot` | sourceType, topArtists/topTracks (JSON), snapshotDate, objectKey (MinIO), payloadSizeBytes, checksum | ManyToOne → User |

### Social
| Entity | Key Fields | Relationships |
|---|---|---|
| `Friendship` | createdAt | ManyToOne → User (follower, following) |
| `UserFollow` | — | ManyToOne → User (x2) |
| `UserLike` | createdAt | ManyToOne → User (liker, liked) |
| `UserMatch` | likedAt, matchedAt (both directions), unmatched, unmatchedAt | ManyToOne → User (user1, user2) |

### Chat
| Entity | Key Fields | Relationships |
|---|---|---|
| `Conversation` | type (DIRECT/GROUP), groupName, lastMessageAt, lastMessagePreview, matchId (nullable) | OneToMany → ConversationParticipant |
| `ConversationParticipant` | joinedAt, lastReadAt, unreadCount | ManyToOne → Conversation, User |
| `Message` | content, messageType, createdAt | ManyToOne → Conversation, User (sender) |

### Communities
| Entity | Key Fields | Relationships |
|---|---|---|
| `Community` | name (unique), description, genre, country, countryCode, bannerUrl, iconType (IMAGE/EMOJI), iconEmoji, iconUrl, tags (ElementCollection), memberCount, visibility (PUBLIC/PRIVATE), discoveryEnabled, tasteSummaryText | ManyToOne → Artist, User (createdBy) |
| `CommunityMember` | joinedAt, role (OWNER/MEMBER) | ManyToOne → Community, User |
| `CommunityArtist` | — | ManyToOne → Community, Artist |
| `CommunityGenre` | — | ManyToOne → Community, Genre |
| `CommunityTasteProfile` | topArtists/topGenres (JSON), embedding | ManyToOne → Community |
| `CommunityRecommendationCache` | suggestedUserIds (JSON), computedAt | ManyToOne → Community |

### Content
| Entity | Key Fields | Relationships |
|---|---|---|
| `Post` | title, content (TEXT), likeCount, dislikeCount, commentCount, createdAt | ManyToOne → Community, User (author); ElementCollection → PostMedia |
| `PostMedia` | url, mediaType | Embedded in Post |
| `PostReaction` | type (LIKE/DISLIKE) | ManyToOne → Post, User |
| `Comment` | content (TEXT), likeCount, dislikeCount, replyCount | ManyToOne → Post, User (author) |
| `CommentReaction` | type (LIKE/DISLIKE) | ManyToOne → Comment, User |
| `AlbumRating` | score (1-5), review, createdAt, updatedAt | ManyToOne → User, Album |

### Music
| Entity | Key Fields | Relationships |
|---|---|---|
| `Artist` | id (Long, Deezer), name, spotifyId (unique), lastfmName, images (ElementCollection), listeners, playcount, summary, popularityScore, genresEnriched | ManyToOne → Genre (primaryGenre) |
| `Album` | id (Long, Deezer), title, covers (small/med/big/xl), releaseDate, label, duration, nbTracks, fans, genres (ElementCollection) | ManyToOne → Artist; OneToMany → Track |
| `Track` | id (Long, Deezer), title, duration, preview, trackRank | ManyToOne → Album, Artist |
| `Genre` | id (Long), name | OneToMany → Artist, Album |
| `ArtistGenre` | — | ManyToOne → Artist, Genre |
| `Country` | code (2-char), name, emoji | — |
