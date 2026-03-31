# web/src/ — Root Files

## Files

### `proxy.ts`
Clerk middleware for route protection. Defines allowed public prefixes (`/`, `/api`, `/_next`, `/blog`, `/coming-soon`, `/privacy`, etc.). In production, redirects disallowed routes to `/`.

### Root Components (in `components/`)

#### `UserSync.tsx`
Runs on mount for authenticated users. Creates backend user if it doesn't exist (via `createBackendUser()`), updates profile image if changed, redirects new users to `/profile`. Renders nothing (`null`).

#### `FontLoader.tsx`
Injects Material Symbols Outlined font stylesheet from Google Fonts into document head. Renders nothing.
