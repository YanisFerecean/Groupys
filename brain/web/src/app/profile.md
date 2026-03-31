# web/src/app/profile/

User profile pages — own profile and public view.

## Files

| File | Purpose |
|---|---|
| `layout.tsx` | Profile layout (AppShell wrapper) |
| `page.tsx` | Own profile — `ProfileView` with edit drawer, Spotify connect handling |
| `[username]/page.tsx` | Public profile for another user — `PublicProfileView` |

## Data Flow

1. Own profile: `useProfileCustomization()` fetches/creates backend user, loads widgets
2. Spotify callback: URL params `?code=...` handled in `ProfileView` to exchange OAuth code
3. Public profile: fetches user by username from backend, renders read-only widget grid
4. Profile editing via `ProfileEditDrawer` — saves to backend via `updateBackendUser()`

## Dependencies
- Internal: [profile components](../../components/profile.md), [useProfileCustomization](../../hooks.md)
