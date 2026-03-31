# mobile/models/

TypeScript interfaces for mobile data models.

## Core User/Profile
| File | Interface | Key Fields |
|---|---|---|
| `UserProfile.ts` | `UserProfile` | id, name, image, bio, followers, following |
| `ProfileCustomization.ts` | `ProfileCustomization`, `TopSong`, `TopArtist`, `TopAlbum` | Widget data, colors, sizes, order, Spotify sync flags |

## Music
| File | Interface | Key Fields |
|---|---|---|
| `Artist.ts` | `Artist` | id, name, image, genres, listeners |
| `ArtistRes.ts` | `ArtistRes` | Backend artist response with popularity, summary |
| `ArtistAlbumRes.ts` | `ArtistAlbumRes` | Artist's album listing |
| `ArtistTopTrack.ts` | `ArtistTopTrack` | Top track with rank, preview URL |
| `AlbumRes.ts` | `AlbumRes` | Album with tracks, cover, release date |
| `AlbumOfWeek.ts` | `AlbumOfWeek` | Featured album display data |
| `AlbumSearchResult.ts` | `AlbumSearchResult` | Deezer album search result |
| `ArtistSearchResult.ts` | `ArtistSearchResult` | Deezer artist search result |
| `TrackRes.ts` | `TrackRes` | Track with duration, preview, album/artist |
| `TrackSearchResult.ts` | `TrackSearchResult` | Deezer track search result |
| `Genre.ts` | `Genre` | id, name |
| `SearchResult.ts` | `SearchResult` | Unified search result type |
| `ListeningMetric.ts` | `ListeningMetric` | Listening stats (hours, tracks) |

## Social
| File | Interface | Key Fields |
|---|---|---|
| `Chat.ts` | `Conversation`, `Message`, `Participant` | Chat data with request status, unread counts |
| `ChatMessage.ts` | `ChatMessage` | Legacy: id, text, image, sender, time, date |
| `Community.ts` | `Community` | id, name, tagline, members, color, icon, isLive |
| `CommunityRes.ts` | `CommunityRes` | Backend community response |
| `CommunityMemberRes.ts` | `CommunityMemberRes` | Community member with role |
| `CommentRes.ts` | `CommentRes` | Comment response |
| `Post.ts` | `Post` | id, title, image, author, group, timeAgo, likes, comments |
| `PostRes.ts` | `PostRes` | Backend post response with media, reactions |
| `CuratorProfile.ts` | `CuratorProfile` | User with curator badge/stats |
| `SuggestedCommunity.ts` | `SuggestedCommunity` | Community recommendation |
| `SuggestedUser.ts` | `SuggestedUser` | User recommendation with similarity data |
| `DiscoverUser.ts` | `DiscoverUser` | User in discover section |

## Match/Dating
| File | Interface | Key Fields |
|---|---|---|
| `Match.ts` | `UserMatch`, `LikeResponse`, `SentLike` | Match record, mutual-like response, pending likes |
| `MatchProfile.ts` | `MatchProfile` | Match card data: vibePercent, genres, artists |
