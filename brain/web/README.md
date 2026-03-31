# web/

Next.js 16 (App Router) frontend for Groupys.

## Structure

| Path | Purpose |
|---|---|
| `src/app/` | App Router pages and API routes |
| `src/components/` | Feature and UI components |
| `src/lib/` | API clients, utilities, WebSocket client |
| `src/hooks/` | Custom React hooks (data fetching, WS, presence) |
| `src/store/` | Zustand global state stores |
| `src/types/` | Shared TypeScript type definitions |
| `src/api/` | External music API clients (Deezer, Last.FM) |

## Key Libraries

- **Zustand** — lightweight global state (conversations, discovery, match)
- **TanStack React Query v5** — server state / caching
- **Clerk (`@clerk/nextjs`)** — auth, session tokens for API calls
- **@tiptap/react** — rich text editor (post creation)
- **Framer Motion** — page/component animations
- **shadcn/ui + Radix UI** — accessible UI primitives

## Path Alias

`@/*` → `./src/*`

## Subsystem Docs

- **Routes**: [overview](src/app/README.md) | [album](src/app/album.md) | [api](src/app/api.md) | [blog](src/app/blog.md) | [chat](src/app/chat.md) | [discover](src/app/discover.md) | [feed](src/app/feed.md) | [match](src/app/match.md) | [profile](src/app/profile.md)
- **Components**: [overview](src/components/README.md) | [ui](src/components/ui.md) | [app](src/components/app.md) | [chat](src/components/chat.md) | [discover](src/components/discover.md) | [feed](src/components/feed.md) | [friends](src/components/friends.md) | [landing](src/components/landing.md) | [match](src/components/match.md) | [album](src/components/album.md) | [profile](src/components/profile.md) | [widgets](src/components/profile-widgets.md)
- **State & Data**: [hooks](src/hooks.md) | [store](src/store.md) | [types](src/types.md) | [lib](src/lib/README.md) | [api](src/api.md) | [root](src/root.md)
