# web/src/app/feed/

Social content feed page.

## Files

| File | Purpose |
|---|---|
| `layout.tsx` | Feed layout (AppShell wrapper) |
| `page.tsx` | Main feed — renders `FeedContent` with sidebar |

## Data Flow

Feed loads paginated posts from joined communities via `GET /api/posts/feed?cursor=...&limit=20`. Cursor-based pagination.

## Dependencies
- Internal: [feed components](../../components/feed.md)
