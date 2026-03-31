# mobile/store/ & mobile/stores/

Zustand state stores.

## store/

### `discoveryStore.ts`
State for discovery users and communities.
- **State**: `users: SuggestedUser[]`, `communities: SuggestedCommunity[]`, loading flags
- **Methods**: `setUsers()`, `appendUsers()`, `removeUser()`, `setCommunities()`

### `matchStore.ts`
State for user matches.
- **State**: `matches: UserMatch[]`, `matchesLoading`, `pendingMatchModal`
- **Methods**: `setMatches()`, `addMatch()`, `removeMatch()`, `setPendingMatchModal()`

## stores/

### `useTrendingArtistsStore.ts`
Caches trending artists with a 1-hour TTL to avoid redundant API calls.
- **State**: `artists`, `loading`, `lastFetchedAt`
- **Methods**: `fetchIfStale()` — only re-fetches if >1 hour since last fetch
