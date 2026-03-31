# mobile/components/post/

Post display and creation components.

## Files

### `PostDetailScreen.tsx`
Full post detail screen: title, rich text content, media attachments (images/video via `MediaLightbox`), reactions (like/dislike), comments list.

### `CommentItem.tsx`
Individual comment display: author avatar/name, content, relative time, reply/react actions.

### `MarkdownEditor.tsx`
Rich text editor for post creation. Uses `react-native-pell-rich-editor`. Toolbar with formatting options (bold, italic, heading, link, image).
