# web/src/components/chat/

Real-time messaging UI components.

## Files

### `ConversationList.tsx`
Memoized list item for conversations. Shows other participant's avatar, name, last message preview, relative time, unread count. Uses `Intl.RelativeTimeFormat` for time formatting. Supports decrypted message previews via `decryptedPreviews` Map prop.

### `MessageThread.tsx`
Scrollable message history. Groups messages by day (day separators) and by minute bucket (consecutive messages from same sender collapse). Auto-scrolls to bottom on new messages. Shows `TypingIndicator` at bottom when another user is typing.
- **Props**: `messages`, `conversationId`, `hasMore` (for infinite scroll)

### `MessageBubble.tsx`
Individual message display. Own messages aligned right (purple), others left (gray). Supports reply-to, delete, and message status indicators (sending/sent/failed).

### `MessageInput.tsx`
Text input with emoji picker and send button. Sends `TYPING_START`/`TYPING_STOP` via WebSocket while user types. Enter to send, Shift+Enter for newline.

### `TypingIndicator.tsx`
Animated "..." dots when another user is typing in the conversation.

### `EmojiPicker.tsx`
Emoji selection popover triggered from MessageInput.

### `NewConversationModal.tsx`
Modal to start a new DM. User search input calls `searchUsers()` API. Creates or navigates to existing conversation.

## Dependencies
- Internal: [ws.ts](../../lib.md), [useMessages](../../hooks.md), [chat types](../../types.md)
