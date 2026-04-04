# mobile/

Expo SDK 54 / React Native 0.81.5 app for Groupys. Shares the same backend as the web app.

## Key Libraries

- **Expo Router v6** — file-based routing with typed routes
- **NativeWind v4** — Tailwind CSS for React Native
- **Clerk (`@clerk/expo`)** — auth, session token management
- **Zustand** — global state (same pattern as web)
- **react-native-pell-rich-editor** — rich text post creation
- **expo-image-picker / expo-video / expo-av** — media capture & playback
- **react-native-quick-crypto + @noble/curves** — client-side crypto

## Route Structure

```
app/
├── _layout.tsx                 # Root layout (Clerk provider, font loading)
├── index.tsx                   # Entry redirect (auth check → landing or home)
├── complete-profile.tsx        # One-time profile setup after signup
│
├── (auth)/                     # Unauthenticated screens
│   ├── _layout.tsx             # Redirects to (home) if already signed in
│   ├── landing.tsx             # Marketing landing page
│   ├── sign-in.tsx             # Clerk sign-in
│   ├── sign-up.tsx             # Clerk sign-up
│   └── sso-continue.tsx        # OAuth SSO callback
│
└── (home)/                     # Protected tab navigation
    ├── _layout.tsx             # Tab bar (discover, feed, match, profile)
    ├── create-post.tsx         # Post creation (full-screen)
    │
    ├── (discover)/             # Discovery tab
    │   ├── index.tsx           # Main discover screen (artists, communities, search)
    │   ├── artist/[id].tsx     # Artist detail
    │   ├── community/[id].tsx  # Community detail
    │   ├── post/[id].tsx       # Post detail
    │   └── user/[userId].tsx   # Public user profile
    │
    ├── (feed)/                 # Feed tab
    │   ├── index.tsx           # Social feed
    │   ├── community/[id].tsx
    │   ├── post/[id].tsx
    │   └── user/[userId].tsx
    │
    ├── (match)/                # Match tab
    │   ├── index.tsx           # Swipe-style matching
    │   ├── history.tsx         # Match history
    │   ├── notification.tsx    # Match notifications
    │   ├── chat/index.tsx      # Conversation list
    │   ├── chat/[conversationId].tsx  # Chat thread
    │   ├── community/[id].tsx
    │   ├── post/[id].tsx
    │   └── user/[userId].tsx
    │
    └── (profile)/              # Profile tab
        ├── index.tsx           # Own profile
        ├── settings.tsx        # App settings
        ├── community/[id].tsx
        ├── post/[id].tsx
        └── user/[userId].tsx
```

## Component Organization

Mirrors web structure: `components/{auth,album,chat,community,discover,feed,landing,match,post,profile,navigation,ui}/`

`profile/widgets/` — same widget set as web (TopSongs, TopArtists, TopAlbums, LastRatedAlbum, CurrentlyListening).

## State & Data

- `lib/apiRequest.ts` — authenticated fetch wrapper (Clerk session token)
- `lib/media.ts` — media upload helpers
- `stores/` — Zustand stores
- `models/` — data model interfaces
- `constants/` — shared constants (API URLs, etc.)

## Configuration

- `app.json` — Expo config: SDK 54, new architecture enabled, React Compiler enabled, typed routes enabled
- `tailwind.config.js` — NativeWind with Tailwind preset
- `babel.config.js` — `babel-preset-expo` + `nativewind/babel`
- `metro.config.js` — Metro bundler with NativeWind CSS interop

## Subsystem Docs

- **Routes**: [app/ routing](app/README.md)
- **Components**: [ui](components/ui.md) | [auth](components/auth.md) | [chat](components/chat.md) | [community](components/community.md) | [discover](components/discover.md) | [feed](components/feed.md) | [landing](components/landing.md) | [match](components/match.md) | [navigation](components/navigation.md) | [post](components/post.md) | [profile](components/profile.md) | [widgets](components/profile-widgets.md)
- **State & Data**: [lib](lib.md) | [hooks](hooks.md) | [store](store.md) | [models](models.md) | [types/constants](types-constants.md)
