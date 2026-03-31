# web/src/components/

React components organized by feature.

## Folders

### `ui/`
shadcn/ui primitives (Radix UI + CVA). Key additions beyond stock shadcn:
- `MarkdownContent` — renders markdown with `react-markdown`
- `AuthMedia` — authenticated image/video wrapper (adds Clerk token to media requests)

### `app/`
Shell and navigation:
- `AppShell` — wraps authenticated app; provides sidebar + topbar layout
- `SideNav` — left navigation (desktop)
- `TopBar` — mobile/top navigation with search trigger
- `SettingsDialog` — user settings modal
- `DmButton` — shortcut to open a DM conversation
- `MessagesNavItem` — nav item showing unread message badge

### `chat/`
Real-time messaging UI:
- `ConversationList` — list of conversations with unread counts
- `MessageThread` — scrollable message history for a conversation
- `MessageBubble` — individual message with reply/delete support
- `MessageInput` — text input with emoji picker and send
- `TypingIndicator` — animated "..." when other user is typing
- `EmojiPicker` — emoji selection popover
- `NewConversationModal` — start a new DM (user search)

### `discover/`
- `TrendingArtistsSection` — trending artists carousel
- `CommunitiesSection` — browse/search communities grid
- `CommunityDetail` — community page with posts and members
- `CreateCommunityModal` — form to create a new community
- `ArtistDetail` — artist bio, top tracks, related artists
- `PostDetail` — expanded post view with comments
- `SearchOverlay` — full-screen search (users + communities)
- `WhosOnSection` — online users sidebar

### `feed/`
- `FeedContent` — main feed posts list
- `FeedHeroCard` / `FeedEditorialCard` — editorial content cards
- `FeedSidebar` — trending/suggestions sidebar
- `PlayerBar` — mini music player (currently-listening widget)

### `match/`
- `UserRecommendationCard` — swipeable user card with music taste preview
- `ActionButtons` — like/pass action buttons
- `MatchCelebrationModal` — animated modal on mutual match
- `MatchHistoryListItem` — past match in history list
- `SentLikeListItem` — pending outgoing like

### `profile/`
- `ProfileHeader` — banner, avatar, accent color, name + tags
- `ProfileView` — own profile with edit access
- `PublicProfileView` — read-only profile for other users
- `ProfileEditDrawer` — slide-up drawer for editing profile fields
- `MusicSearchInput` — type-ahead music search (Deezer) for widgets
- `BannerPicker` / `ColorPickerField` — visual customization inputs
- `ProfileWidgetGrid` — drag-and-drop widget layout

### `profile/widgets/`
Individual profile widgets (each renders a card in the widget grid):
- `TopSongsWidget` — top tracks list
- `TopArtistsWidget` — top artists grid
- `TopAlbumWidget` — top albums
- `LastRatedAlbumWidget` — most recently rated album
- `CurrentlyListeningWidget` — now-playing track

### `friends/`
- `FriendsSheet` — slide-out panel showing friends/followers list

### `landing/`
Marketing page sections: `NavBar`, `HeroSection`, `FeaturesSection`, `CtaSection`, `FaqSection`, `CommunitiesPreview`, `AppShowcase`, `TrendingArtists`, `WaitlistForm`, `Footer`

### `album/`
- `AlbumRatingPage` — full album rating flow (score + review)
