# mobile/types/ & mobile/constants/

## types/

### `index.ts`
Barrel re-export file. Re-exports all model types: `ProfileCustomization`, `Post`, `Artist`, `MatchProfile`, `Community`, `ChatMessage`, etc.

### `markdown-it.d.ts` / `markdown.d.ts`
Type declarations for markdown libraries that lack built-in TypeScript types.

## constants/

### `colors.ts`
Material Design color palette.
- **Primary**: `#ba002b` (red)
- Includes: secondary, tertiary, surface variants, outline, error colors

### `mockData.ts`
Sample data for development/preview: `featuredPost`, `artistSpotlight`, `gridPosts`, etc. Used in feed and discover screens during development.
