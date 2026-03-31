# mobile/components/chat/

Real-time messaging components (React Native).

## Files

### `ChatProvider.tsx`
React Context provider for chat state. Wraps the match tab. Manages WebSocket connection lifecycle and exposes chat context to children.

### `ConversationListItem.tsx`
Conversation row in chat inbox. Shows avatar, name, last message preview, relative time, unread badge.

### `ChatRequestListItem.tsx`
Pending conversation request row. Shows accept/deny buttons for incoming message requests.

### `MessageBubble.tsx`
Individual message display. Own messages right-aligned, others left. Supports text content, reply indicators, and delete action.

### `MessageComposer.tsx`
Text input with send button for composing messages. Handles typing indicator events via WebSocket.

### `NewConversationModal.tsx`
Modal to start a new DM. User search input, creates conversation on selection.

### `TypingIndicator.tsx`
Animated dots indicator when the other user is typing.
