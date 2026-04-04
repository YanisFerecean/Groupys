# web/src/app/

Next.js App Router pages and API route handlers.

## Route Tree

```
app/
├── page.tsx                    # Landing page (unauthenticated)
├── layout.tsx                  # Root layout (Clerk provider, fonts, analytics)
├── globals.css                 # Tailwind v4 design tokens + global styles
├── album/[id]/page.tsx         # Album detail + ratings
├── blog/                       # Static blog posts (album-rating, music-and-dating, music-connection)
├── chat/page.tsx               # Chat inbox (conversation list)
├── chat/[conversationId]/      # Individual conversation thread
├── discover/page.tsx           # Discovery feed (artists, communities, users)
├── discover/artist/[id]/       # Artist detail page
├── discover/community/[id]/    # Community detail page
├── discover/post/[id]/         # Single post detail
├── feed/page.tsx               # Editorial/social feed
├── match/page.tsx              # User matching (swipe-style)
├── match/history/              # Past matches & sent likes
├── profile/page.tsx            # Own profile
├── profile/[username]/         # Public profile view
├── coming-soon/                # Placeholder for unreleased features
├── privacy/                    # Privacy policy
└── api/
    ├── music-search/route.ts   # Proxies music search to Deezer (avoids CORS)
    └── waitlist/route.ts       # Waitlist signup via Resend email
```

## API Routes

### `GET /api/music-search`
Proxies Deezer search server-side. Accepts `?q=` query param. Avoids CORS from client.

### `POST /api/waitlist`
Sends waitlist confirmation email via Resend. Body: `{ email: string }`.

## Notes

- All authenticated pages use Clerk's `useAuth()` / `useUser()` for session management.
- `opengraph-image.tsx`, `robots.ts`, `sitemap.ts` at root handle SEO metadata.
