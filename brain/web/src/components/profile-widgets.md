# web/src/components/profile/widgets/

Individual profile widgets rendered inside `ProfileWidgetGrid`.

## Files

### `WidgetCard.tsx`
Shared container for all widgets. Renders a rounded card with title, custom `textColor`, and children.
- **Props**: `title`, `className?`, `style?`, `textColor?`, `children`

### `TopSongsWidget.tsx`
Displays user's top songs list. Each row: track title, artist name, cover art thumbnail.

### `TopArtistsWidget.tsx`
Displays user's top artists in a grid/list. Each item: artist name, genre, image.

### `TopAlbumWidget.tsx`
Displays user's top albums. Each item: album title, artist name, cover art.

### `LastRatedAlbumWidget.tsx`
Shows the most recently rated album with score and review preview. Fetches from `fetchMyAlbumRatings()`.

### `CurrentlyListeningWidget.tsx`
Shows the currently playing track (Spotify sync or manual). Track title, artist, cover art. Optionally auto-synced from Spotify API.

## Notes
- Each widget can have a custom container color set via `ProfileEditDrawer`
- Widget size can be `"small"` or `"normal"`, controlled by `widgetSizes` in `ProfileCustomization`
- Widgets can be hidden via `hiddenWidgets` array (edit mode only)
- Spotify-synced widgets show a Spotify icon badge
