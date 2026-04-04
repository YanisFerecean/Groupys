# web/src/store/

Zustand global state stores.

## Files

### `conversationStore.ts`
Manages the conversation list for the chat inbox.
- **State**: `conversations: Conversation[]`
- **Methods**:
  - `setConversations(list)` — replace all
  - `appendConversations(list)` — append (pagination)
  - `updateConversation(id, partial)` — merge update
  - `removeConversation(id)` — delete
  - `bubbleConversation(id)` — move to top of list (on new message)

### `discoveryStore.ts`
Manages the discovery/recommendation card queue.
- **State**: `users: SuggestedUser[]`, `usersLoading`, `usersRefreshing`, `isFetchingMore`
- **Methods**:
  - `setUsers(list)` — replace
  - `appendUsers(list)` — append with deduplication
  - `removeUser(id)` — remove after like/pass
  - `setUsersLoading/Refreshing/IsFetchingMore` — loading flags

### `matchStore.ts`
Manages matched users and the match celebration modal.
- **State**: `matches: UserMatch[]`, `matchesLoading`, `pendingMatchModal: UserMatch | null`
- **Methods**:
  - `setMatches(list)` — replace
  - `addMatch(match)` — add new
  - `removeMatch(id)` — remove (unmatch)
  - `setPendingMatchModal(match | null)` — show/hide celebration modal
  - `updateMatchUnread(matchId, count)` — update unread message count
