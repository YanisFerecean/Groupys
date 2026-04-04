# web/src/components/landing/

Marketing landing page sections (unauthenticated visitors).

## Files

| File | Purpose |
|---|---|
| `NavBar.tsx` | Top navigation with logo and sign-in/sign-up links |
| `HeroSection.tsx` | Hero banner with tagline and CTA |
| `FeaturesSection.tsx` | Feature highlight cards (match, discover, communities, chat) |
| `CtaSection.tsx` | Call-to-action section with sign-up prompt |
| `FaqSection.tsx` | Accordion-style FAQ section |
| `CommunitiesPreview.tsx` | Preview of sample communities |
| `AppShowcase.tsx` | App screenshot gallery / demo preview |
| `TrendingArtists.tsx` | Trending artist display (fetches from Last.FM) |
| `WaitlistForm.tsx` | Email input to join waitlist (posts to `/api/waitlist`) |
| `Footer.tsx` | Site footer with links and branding |

## Notes
- All components are presentational / lightly data-fetching.
- `WaitlistForm` is the only component that calls an API (waitlist route).
