# backend/.../config/

Application configuration, security, and startup hooks.

## Files

### `OpenApiSecurityConfig.java`
Adds JWT Bearer security scheme to OpenAPI/Swagger UI documentation.

### `PerformanceFeatureFlags.java`
Runtime feature flags (read from `application.properties`):
- Embedding/vectorization enable/disable
- Schema bootstrap toggle
- Used to gate expensive operations in development vs production

### `SchemaBootstrapService.java`
Runs on startup (`@Observes StartupEvent`). Performs database schema migrations:
- Adds columns for music snapshots
- Adds chat read-model columns (last_message_at, unread_count)
- Adds post reaction count columns (like_count, dislike_count)
- Adds embedding metadata columns
- Seeds genres and countries via `GenreSeed` / `CountrySeed`

### `RedisHealthCheck.java`
Custom MicroProfile Health check for Redis connectivity. Reports UP/DOWN for liveness probes.
