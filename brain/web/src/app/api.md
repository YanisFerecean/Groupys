# web/src/app/api/

Next.js API route handlers — server-side proxies to avoid CORS and protect secrets.

## Routes

### `GET /api/music-search`
Proxies music search to the Quarkus backend. Passes Clerk auth token.
- **Query**: `?q=<query>&type=track|album|artist`
- **Returns**: `BackendTrack[]`, `BackendAlbum[]`, or `BackendArtist[]`
- **Why proxy?**: Avoids CORS issues when calling backend from browser.

### `POST /api/waitlist`
Sends a waitlist confirmation email via the Resend SDK.
- **Body**: `{ email: string }`
- **Validation**: Email format regex, trims whitespace, case-insensitive
- **Env**: Requires `RESEND_API_KEY`
