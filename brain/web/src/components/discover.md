# web/src/components/discover/

Discovery section components — browse artists, communities, and online users.

## Files

### `TrendingArtistsSection.tsx`
Horizontal carousel of trending artists. Fetches from Last.FM chart API via backend.

### `CommunitiesSection.tsx`
Grid of communities with search. Lists user's joined communities + trending ones. Links to community detail pages.

### `CommunityDetail.tsx`
Full community page: banner, description, member count, join/leave button, post feed, member list. Renders posts with `FeedContent`-style cards.

### `CreateCommunityModal.tsx`
Form modal to create a new community: name, description, genre, icon (emoji or image upload), tags.

### `ArtistDetail.tsx`
Artist profile page: bio (from Last.FM), top tracks (from Deezer), image, listener/playcount stats. Links to album pages.

### `PostDetail.tsx`
Expanded post view with full content (markdown), media attachments (images/video), reactions (like/dislike), and comments thread.

### `SearchOverlay.tsx`
Full-screen search overlay. Three tabs: Users, Communities, Music. Debounced search input. Music search returns artists, albums, tracks from backend Deezer proxy.
- **Types defined locally**: `ArtistRes`, `AlbumRes`, `TrackRes`, `MusicResult`

### `SectionHeader.tsx`
Reusable section title with optional "View all" link.

### `WhosOnSection.tsx`
Sidebar showing currently online users. Currently renders hardcoded mock data.
