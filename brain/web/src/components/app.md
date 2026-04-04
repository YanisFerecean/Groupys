# web/src/components/app/

Application shell and navigation components.

## Files

### `AppShell.tsx`
Main layout wrapper for all authenticated pages. Renders:
- `SideNav` (desktop sidebar)
- `TopBar` (mobile/responsive top navigation)
- `SearchOverlay` (full-screen search)
- `SettingsDialog` (user settings modal)

**State**: `sidebarOpen`, `searchOpen`, `settingsOpen`, `spotifyConnected`
**Hooks**: `useWebSocket()` (starts WS connection), `useAuth()`, `useUser()`

### `SideNav.tsx`
Left sidebar navigation. Links: Discover, Feed, Match, Chat, Profile. Shows unread message count.

### `TopBar.tsx`
Top navigation bar (mobile-first). Search trigger, user avatar, settings button.

### `SettingsDialog.tsx`
Settings modal with account options. Uses `Dialog` from shadcn/ui.

### `DmButton.tsx`
Shortcut button to initiate a DM conversation with a specific user.

### `MessagesNavItem.tsx`
Navigation link with unread message badge count. Subscribes to `conversationStore` for real-time count updates.

## Dependencies
- Internal: [SearchOverlay](discover.md), [SideNav/TopBar peers], [conversationStore](../../store.md)
