# backend/.../util/

Helper functions and seed data.

## Files

### `UserUtil.java`
Converts `User` entity → `UserResDto` response DTO. Includes follower/following count computation.

### `CommunityUtil.java`
Converts `Community` entity → `CommunityResDto` response DTO.

### `CountryUtil.java`
Country code normalization and validation helpers.

### `DiscoveryScoreUtil.java`
Scoring algorithms for matching/recommendation:
- `normalizedRankScore()` — position-based decay
- `weightedOverlap()` — weighted Jaccard similarity
- `countryMatchScore()` — bonus for same country
- `activityScore()` — recency-weighted activity measure
- `clamp01()` — clamp to [0, 1] range

### `MusicIdentityUtil.java`
Normalizes artist/track identifiers across Deezer, Spotify, and Last.FM for cross-API matching.

### `CountrySeed.java`
Static seed data for countries table (code, name, emoji). Run by `SchemaBootstrapService` on startup.

### `GenreSeed.java`
Static seed data for genres table. Run by `SchemaBootstrapService` on startup.
