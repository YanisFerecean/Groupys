# web/src/components/match/

User matching (dating/friendship discovery) components.

## Files

### `UserRecommendationCard.tsx`
Swipeable card for user recommendations. Uses Framer Motion for drag/swipe animations.
- **Ref methods**: `swipeRight()`, `swipeLeft()` (called by parent ActionButtons)
- **Constants**: `SWIPE_THRESHOLD = 120px`, `FLY_OUT_DISTANCE = 1200px`
- **Animations**: Card rotation based on drag direction, opacity fade, fly-out on release
- **Props**: `user: SuggestedUser`, `stackIndex`, `onLike`, `onDismiss`

### `ActionButtons.tsx`
Like (heart) and Pass (X) action buttons below the card stack. Triggers card ref methods.

### `MatchCelebrationModal.tsx`
Animated modal on mutual match. Shows both users' avatars and a "Start chatting" CTA. State: reads `pendingMatchModal` from `useMatchStore`.

### `MatchHistoryListItem.tsx`
List item for match history. Shows matched user info, compatibility score, and matched date.

### `SentLikeListItem.tsx`
List item for pending outgoing likes (not yet matched). Shows user info and "Pending" status.

## Dependencies
- Internal: [match types](../../types.md), [matchStore](../../store.md), [useDiscovery](../../hooks.md)
