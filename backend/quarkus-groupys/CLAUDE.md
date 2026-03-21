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

Quarkus 3.32.4 backend (Java 25) that aggregates music data from **Deezer** (search, metadata, IDs, images) and **Last.FM** (listeners, playcount, bio, charts) into JPA entities, exposed via REST.

```
Resource (JAX-RS) → Service → REST Client (Deezer/LastFM external APIs)
                             → Repository (DB via PanacheRepositoryBase)
                             → Mapper (DTO ↔ Entity conversion)
```

### Key Design Decisions

- **Repository pattern**: Uses `PanacheRepositoryBase<Entity, Long>`, NOT `PanacheEntity`. Entities have private fields with getters/setters.
- **Entity IDs from Deezer**: `@Id` with NO `@GeneratedValue` — IDs are externally assigned from Deezer.
- **Dual-API merge**: Artist data merges Deezer (id, name, images) + LastFM (listeners, playcount, summary). Albums/Tracks come from Deezer only.
- **Never return entities from REST**: Always map to response DTOs to avoid `LazyInitializationException`.
- **Concrete REST Client responses**: No generics in REST client return types (Java type erasure prevents deserialization).
- **`rank` is SQL reserved**: Track entity uses `@Column(name = "track_rank")`.
- **LastFM returns numbers as strings**: Parse with `Long.parseLong()` in mappers/services.

### Package Layout (`src/main/java/com/groupys/`)

| Package | Purpose |
|---------|---------|
| `client/` | REST clients: `DeezerClient`, `LastFmClient` |
| `dto/deezer/` | Deezer API response records (`@JsonProperty` for snake_case) |
| `dto/lastfm/` | LastFM API response records (deeply nested JSON structure) |
| `dto/` | Response DTOs returned by REST endpoints |
| `mapper/` | Conversion between external DTOs, entities, and response DTOs |
| `model/` | JPA entities: `Artist`, `Album`, `Track`, `User` |
| `repository/` | `PanacheRepositoryBase` implementations |
| `resource/` | JAX-RS REST endpoints (all under `/api` root path) |
| `service/` | Business logic, external API orchestration, enrichment |

### API Root & External Services

- All endpoints prefixed with `/api` (`quarkus.rest.path=/api`)
- Deezer API: `https://api.deezer.com`
- LastFM API: `https://ws.audioscrobbler.com/2.0/` (key via `LASTFM_API_KEY` env var)
- PostgreSQL: `localhost:5432/db`
- MinIO: `localhost:9000`

## Coding Conventions

- 4-space indentation, standard Java style
- PascalCase classes, camelCase methods/fields
- Layer suffixes: `UserRepository`, `UserService`, `UserResDto`
- Conventional Commits: `feat(backend): add user lookup endpoint`, `fix(ci): #6`
- DTOs are Java records; entities use private fields with getters/setters
