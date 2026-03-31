# Brain Index

## Project
- [PROJECT.md](PROJECT.md) — App overview, tech stack, architecture, env vars

## Web (Next.js 16)
- [web/README.md](web/README.md) — Frontend overview and structure
- **Routes (app/)**
  - [web/src/app/README.md](web/src/app/README.md) — Route tree overview
  - [web/src/app/album.md](web/src/app/album.md) — Album detail + ratings
  - [web/src/app/api.md](web/src/app/api.md) — API route handlers (music-search, waitlist)
  - [web/src/app/blog.md](web/src/app/blog.md) — Blog/SEO pages
  - [web/src/app/chat.md](web/src/app/chat.md) — Chat inbox + conversation thread
  - [web/src/app/discover.md](web/src/app/discover.md) — Discovery: artists, communities, posts
  - [web/src/app/feed.md](web/src/app/feed.md) — Social feed
  - [web/src/app/match.md](web/src/app/match.md) — User matching (swipe)
  - [web/src/app/profile.md](web/src/app/profile.md) — Profile (own + public)
- **Components**
  - [web/src/components/README.md](web/src/components/README.md) — Component overview
  - [web/src/components/ui.md](web/src/components/ui.md) — shadcn/ui primitives + AuthMedia, Markdown
  - [web/src/components/app.md](web/src/components/app.md) — AppShell, SideNav, TopBar
  - [web/src/components/chat.md](web/src/components/chat.md) — ConversationList, MessageThread, etc.
  - [web/src/components/discover.md](web/src/components/discover.md) — Search, artists, communities
  - [web/src/components/feed.md](web/src/components/feed.md) — Feed posts, sidebar, player
  - [web/src/components/friends.md](web/src/components/friends.md) — FriendsSheet
  - [web/src/components/landing.md](web/src/components/landing.md) — Marketing landing page sections
  - [web/src/components/match.md](web/src/components/match.md) — Swipe cards, celebration modal
  - [web/src/components/album.md](web/src/components/album.md) — AlbumRatingPage
  - [web/src/components/profile.md](web/src/components/profile.md) — Profile header, edit drawer, widget grid
  - [web/src/components/profile-widgets.md](web/src/components/profile-widgets.md) — Individual profile widgets
- **State & Data**
  - [web/src/hooks.md](web/src/hooks.md) — Custom hooks (WS, conversations, messages, discovery, crypto)
  - [web/src/store.md](web/src/store.md) — Zustand stores (conversation, discovery, match)
  - [web/src/types.md](web/src/types.md) — TypeScript types (chat, match, profile)
  - [web/src/lib/README.md](web/src/lib/README.md) — API clients, WebSocket, utilities
  - [web/src/api.md](web/src/api.md) — External music API wrappers (Deezer, Last.FM)
  - [web/src/root.md](web/src/root.md) — proxy.ts, UserSync, FontLoader

## Mobile (Expo SDK 54)
- [mobile/README.md](mobile/README.md) — Mobile app overview
- [mobile/app/README.md](mobile/app/README.md) — Expo Router routes (auth, discover, feed, match, profile)
- **Components**
  - [mobile/components/ui.md](mobile/components/ui.md) — Primitive UI components
  - [mobile/components/auth.md](mobile/components/auth.md) — Auth screens (scaffold, SSO)
  - [mobile/components/chat.md](mobile/components/chat.md) — Chat UI (provider, messages, composer)
  - [mobile/components/community.md](mobile/components/community.md) — Community detail, create, edit
  - [mobile/components/discover.md](mobile/components/discover.md) — Discovery cards (artists, communities, genres)
  - [mobile/components/feed.md](mobile/components/feed.md) — Feed posts, spotlight, grid
  - [mobile/components/landing.md](mobile/components/landing.md) — Landing page sections
  - [mobile/components/match.md](mobile/components/match.md) — Match cards, celebration, history
  - [mobile/components/navigation.md](mobile/components/navigation.md) — SwipeableTabScreen
  - [mobile/components/post.md](mobile/components/post.md) — Post detail, comments, markdown editor
  - [mobile/components/profile.md](mobile/components/profile.md) — Profile header, edit, Spotify connect
  - [mobile/components/profile-widgets.md](mobile/components/profile-widgets.md) — Mobile profile widgets
- **State & Data**
  - [mobile/lib.md](mobile/lib.md) — API client, WebSocket, crypto, media, utilities
  - [mobile/hooks.md](mobile/hooks.md) — Custom hooks (auth, chat, discovery, matches, Spotify)
  - [mobile/store.md](mobile/store.md) — Zustand stores (discovery, match, trending artists)
  - [mobile/models.md](mobile/models.md) — TypeScript data models (29 interfaces)
  - [mobile/types-constants.md](mobile/types-constants.md) — Type barrel, colors, mock data

## Backend (Quarkus 3.32.4)
- [backend/README.md](backend/README.md) — Backend overview and architecture
- [backend/resource.md](backend/resource.md) — REST endpoints (17 resources, all paths)
- [backend/service.md](backend/service.md) — Business logic (32+ services, background jobs)
- [backend/model.md](backend/model.md) — JPA entities (36 entities, relationships)
- [backend/dto.md](backend/dto.md) — DTOs (response, request, Deezer, LastFM, Spotify)
- [backend/repository.md](backend/repository.md) — Data access (31+ Panache repositories)
- [backend/client.md](backend/client.md) — External API clients (Deezer, LastFM, Spotify)
- [backend/websocket.md](backend/websocket.md) — WebSocket chat endpoint + protocol
- [backend/config.md](backend/config.md) — App config, feature flags, schema bootstrap
- [backend/util.md](backend/util.md) — Scoring, identity, seed data helpers
- [backend/mapper.md](backend/mapper.md) — Entity ↔ DTO mappers

## Infrastructure
- [docker/README.md](docker/README.md) — Dev infra (Postgres, MinIO, Redis) and production compose
