# mobile/app/

Expo Router v6 file-based routing with typed routes.

## Root Files

| File | Purpose |
|---|---|
| `_layout.tsx` | Root layout: Clerk provider, font loading, `AuthTokenProvider`, navigation container |
| `index.tsx` | Entry redirect: checks auth state → landing (unauthenticated) or home (authenticated) |
| `complete-profile.tsx` | One-time profile setup screen after signup (username, display name, bio, avatar) |

## Route Groups

### `(auth)/` — Unauthenticated Screens
| File | Purpose |
|---|---|
| `_layout.tsx` | Redirects to `(home)` if already signed in |
| `landing.tsx` | Marketing landing page with CTA buttons |
| `sign-in.tsx` | Clerk sign-in form |
| `sign-up.tsx` | Clerk sign-up form |
| `sso-continue.tsx` | OAuth SSO callback handler |

### `(home)/` — Protected Tab Navigation
| File | Purpose |
|---|---|
| `_layout.tsx` | Tab bar layout: Discover, Feed, Match, Profile tabs |
| `create-post.tsx` | Full-screen post creation with rich text editor |

### `(home)/(discover)/` — Discovery Tab
| File | Purpose |
|---|---|
| `_layout.tsx` | Stack navigator for discover section |
| `index.tsx` | Main discover screen: trending artists, communities, genre cards, search |
| `artist/[id].tsx` | Artist detail (bio, top tracks) |
| `community/[id].tsx` | Community detail (posts, members, join/leave) |
| `post/[id].tsx` | Post detail with comments |
| `user/[userId].tsx` | Public user profile |

### `(home)/(feed)/` — Feed Tab
| File | Purpose |
|---|---|
| `_layout.tsx` | Stack navigator for feed |
| `index.tsx` | Social feed with posts from joined communities |
| `community/[id].tsx` | Community detail (from feed context) |
| `post/[id].tsx` | Post detail |
| `user/[userId].tsx` | Public user profile |

### `(home)/(match)/` — Match Tab
| File | Purpose |
|---|---|
| `_layout.tsx` | Stack navigator for match section |
| `index.tsx` | Swipe-style user matching |
| `history.tsx` | Match history + sent likes |
| `notification.tsx` | Match notifications screen |
| `chat/index.tsx` | Conversation list |
| `chat/[conversationId].tsx` | Chat thread |
| `community/[id].tsx`, `post/[id].tsx`, `user/[userId].tsx` | Shared detail screens |

### `(home)/(profile)/` — Profile Tab
| File | Purpose |
|---|---|
| `_layout.tsx` | Stack navigator for profile section |
| `index.tsx` | Own profile with widgets and edit button |
| `settings.tsx` | App settings (account, Spotify, logout) |
| `community/[id].tsx`, `post/[id].tsx`, `user/[userId].tsx` | Shared detail screens |

## Notes
- Detail screens (`community/[id]`, `post/[id]`, `user/[userId]`) are duplicated across tabs to maintain independent navigation stacks per tab.
- `profileRoutes.ts` in `lib/` provides helper functions to generate correct paths per tab context.
