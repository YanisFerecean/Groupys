# web/src/components/profile/

User profile display and editing components.

## Files

### `ProfileHeader.tsx`
Banner image, avatar, display name (with custom `nameColor`), accent color border, bio, country flag, tags list. Adapts for own profile (edit button) vs public view.

### `ProfileView.tsx`
Own profile page. Orchestrates: `ProfileHeader`, `ProfileWidgetGrid`, `ProfileEditDrawer`.
- **Hooks**: `useProfileCustomization()`, `useSearchParams()` (Spotify callback), `useUser()`, `useAuth()`
- **Spotify flow**: Detects `?code=` URL param, exchanges for token, syncs top music data

### `PublicProfileView.tsx`
Read-only profile for viewing other users. Same layout as `ProfileView` but no edit controls. Shows follow/DM buttons instead.

### `ProfileEditDrawer.tsx`
Slide-up drawer for editing profile fields: display name, bio, country, tags, banner, accent color, name color. Saves via `updateBackendUser()`.

### `ProfileWidgetGrid.tsx`
Drag-and-drop widget layout. Users can reorder widgets, toggle visibility, change sizes (small/normal), set per-widget colors.
- **Widget types**: `topAlbums`, `currentlyListening`, `topSongs`, `topArtists`, `lastRatedAlbum`
- **Drag state**: Tracks `dragging`, `dragOverIndex` for reorder

### `MusicSearchInput.tsx`
Type-ahead search input for adding music to widgets. Searches Deezer via `/api/music-search` proxy. Returns tracks, artists, or albums depending on context.

### `BannerPicker.tsx`
Image upload/URL input for profile banner. Resizes image client-side before upload.

### `ColorPickerField.tsx`
Color picker input for accent color and name color customization. Renders a color swatch grid.

## Dependencies
- Internal: [profile widgets](profile-widgets.md), [useProfileCustomization](../../hooks.md), [api.ts](../../lib.md)
