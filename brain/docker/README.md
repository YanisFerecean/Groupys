# docker/

Local development infrastructure and production Docker Compose config.

## Files

| File | Purpose |
|---|---|
| `docker-compose.yaml` | Dev infra: PostgreSQL 18, MinIO, Redis |
| `docker-compose.prod.yaml` | Production: web service + infra |
| `.env.prod.example` | Production env var template |

## Dev Services (`docker-compose.yaml`)

| Service | Image | Port(s) | Credentials |
|---|---|---|---|
| PostgreSQL | `pgvector/pgvector:pg18` | 5432 | user: `app`, pass: `app`, db: `db` |
| MinIO | latest | 9000 (API), 9001 (console) | admin / admin123 |
| Redis | `redis:7-alpine` | 6379 | — |

Volume: `groupys_data_pg18` (persistent Postgres data)

## Production (`docker-compose.prod.yaml`)

Runs the web frontend container alongside the infra services. Requires env vars from `.env.prod.example`:
- `WEB_IMAGE` — container image URI (e.g. `ghcr.io/your-org/groupys-web:latest`)
- Clerk keys, Resend API key, LastFM key, Spotify credentials

## Web Dockerfile (`web/Dockerfile`)

Multi-stage build:
1. `deps` — `npm ci` with package-lock
2. `builder` — `npm run build` (accepts `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `RESEND_API_KEY` as build secrets)
3. `runner` — Node 22-alpine, runs as non-root `nextjs` user, exposes port 3000

## Start Dev Infra

```bash
cd docker && docker compose up -d
```
