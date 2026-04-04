# web/src/app/match/

User matching (dating/friendship) pages.

## Files

| File | Purpose |
|---|---|
| `page.tsx` | Swipe-style matching — renders stacked `UserRecommendationCard` components |
| `history/page.tsx` | Match history list + sent likes tab |

## Data Flow

1. Match page uses `useDiscovery()` to fetch suggested users (based on taste similarity)
2. Like/pass actions call `likeUser()` / `passUser()` from `useDiscovery()`
3. On mutual like, `MatchCelebrationModal` appears with option to open chat
4. History page uses `useMatches()` for accepted matches + sent likes

## Dependencies
- Internal: [match components](../../components/match.md), [useDiscovery](../../hooks.md), [useMatches](../../hooks.md)
