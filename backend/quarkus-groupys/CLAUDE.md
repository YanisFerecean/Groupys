# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

Run all commands from `backend/quarkus-groupys`:

- `./mvnw quarkus:dev` — start API with live reload (Dev UI at `http://localhost:8080/q/dev`, Swagger UI at `http://localhost:8080/api/q/swagger-ui`)
- `./mvnw test` — run tests
- `./mvnw compile -q` — quick compilation check
- `./mvnw package` — build runnable JAR in `target/quarkus-app/`
- `cd ../../docker && docker compose up -d` — start PostgreSQL and MinIO dependencies

## Architecture

Quarkus 3.32.4 backend (Java 25) sourcing all music data from **Apple Music** (MusicKit catalog + per-user library APIs) into JPA entities, exposed via REST. Deezer and Last.fm integrations have been removed as of the Apple Music hard-cutover.

```
Resource (JAX-RS) → Service → AppleCatalogService → AppleMusicApiClient (MusicKit REST)
                            → AppleCatalogEntityService → Repository (DB via PanacheRepositoryBase)
                            → Mapper (Apple DTO ↔ Entity ↔ Response DTO)
```

### Key Design Decisions

- **Repository pattern**: Uses `PanacheRepositoryBase<Entity, Long>`, NOT `PanacheEntity`. Entities have private fields with getters/setters.
- **Synthetic entity IDs**: `Artist`/`Album`/`Track` `@Id` is a stable `Long` derived from `MusicIdentityUtil` (SHA-256 of the Apple Music catalog ID, falling back to a name-based hash). No `@GeneratedValue`. `appleMusicId` is stored separately with a unique index.
- **Single-source merge**: Artist/Album/Track data comes solely from Apple Music. No second-API enrichment. Legacy fields like `Artist.listeners`/`playcount` are nullable and left unpopulated.
- **Never return entities from REST**: Always map to response DTOs to avoid `LazyInitializationException`.
- **Concrete REST Client responses**: `AppleMusicApiClient` returns `String` payloads; `AppleCatalogService` parses with Jackson (Java type erasure prevents generic deserialization).
- **`rank` is SQL reserved**: Track entity uses `@Column(name = "track_rank")`.
- **Storefront resolution**: `AppleStorefrontUtil` derives the per-user Apple storefront before catalog calls.

### Package Layout (`src/main/java/com/groupys/`)

| Package | Purpose |
|---------|---------|
| `client/` | REST client: `AppleMusicApiClient` |
| `dto/apple/` | Apple Music API response records (`AppleCatalogArtist`, `AppleCatalogAlbum`, `AppleCatalogSong`, `AppleCatalogGenre`, `AppleSearchResult`, `AppleChartsResult`) |
| `dto/` | Response DTOs returned by REST endpoints |
| `mapper/` | Conversion between Apple DTOs, entities, and response DTOs |
| `model/` | JPA entities: `Artist`, `Album`, `Track`, `Genre`, `User` |
| `repository/` | `PanacheRepositoryBase` implementations |
| `resource/` | JAX-RS REST endpoints (all under `/api` root path) |
| `service/` | Business logic, Apple Music orchestration, enrichment (`AppleCatalogService`, `AppleCatalogEntityService`, `MusicService`, `ChartService`, `DiscoveryService`, `AlbumService`, `ArtistService`, `TrackService`) |
| `util/` | `MusicIdentityUtil`, `AppleStorefrontUtil`, `GenreSeed`, `UserUtil`, `CountryUtil` |

### API Root & External Services

- All endpoints prefixed with `/api` (`quarkus.rest.path=/api`)
- Apple Music API: `https://api.music.apple.com` (configured via `quarkus.rest-client.apple-music-api.url`)
- Developer token signed locally using `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_MEDIA_ID`, TTL via `APPLE_DEVELOPER_TOKEN_TTL_SECONDS` (default 300)
- PostgreSQL: `localhost:5432/db`
- MinIO: `localhost:9000`

## Coding Conventions

- 4-space indentation, standard Java style
- PascalCase classes, camelCase methods/fields
- Layer suffixes: `UserRepository`, `UserService`, `UserResDto`
- Conventional Commits: `feat(backend): add user lookup endpoint`, `fix(ci): #6`
- DTOs are Java records; entities use private fields with getters/setters
