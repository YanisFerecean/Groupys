# web/src/app/discover/

Discovery section — browse artists, communities, users, and posts.

## Files

| File | Purpose |
|---|---|
| `layout.tsx` | Discover layout (AppShell wrapper) |
| `page.tsx` | Main discover page: trending artists, communities grid, online users |
| `prose.css` | Custom markdown prose styling for content pages |
| `artist/[id]/page.tsx` | Artist detail — bio, top tracks, related artists |
| `community/[id]/page.tsx` | Community detail — posts, members, join/leave |
| `post/[id]/page.tsx` | Single post detail with comments |

## Data Flow

- Discover page aggregates: `TrendingArtistsSection`, `CommunitiesSection`, `WhosOnSection`
- Artist/community/post pages fetch by ID from backend
- All pages behind Clerk auth

## Dependencies
- Internal: [discover components](../../components/discover.md)
