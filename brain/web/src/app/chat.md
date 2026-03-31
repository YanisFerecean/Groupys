# web/src/app/chat/

Real-time messaging pages.

## Files

| File | Purpose |
|---|---|
| `layout.tsx` | Chat layout — wraps with AppShell, sets up WebSocket |
| `page.tsx` | Chat inbox — renders `ConversationList` |
| `[conversationId]/page.tsx` | Individual conversation thread — renders `MessageThread` + `MessageInput` |

## Data Flow

1. `page.tsx` uses `useConversations()` hook to fetch paginated conversation list
2. Selecting a conversation navigates to `[conversationId]/page.tsx`
3. Conversation page uses `useMessages(conversationId)` for paginated message history
4. Real-time updates via `chatWs` WebSocket (MESSAGE_NEW, TYPING, PRESENCE)
5. E2E encryption: `useCrypto()` provides encrypt/decrypt functions passed to `useMessages()`

## Dependencies
- Internal: [chat components](../../components/chat.md), [useMessages](../../hooks.md), [ws](../../lib.md)
