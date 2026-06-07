# Groupys — Production Deployment Runbook

This is the operator checklist of **manual / secret steps** that the code in this repo
cannot do for you. The code/infra (CI workflows, prod compose stack, rate-limit
fallback, EAS scaffold) is already in place; this doc lists the values you must supply.

Order: stand up the **backend** first (mobile and web point at it), then **mobile**.

---

## 1. Backend (Quarkus API)

Deployed by `.github/workflows/deploy-backend-prod.yml` → builds `Dockerfile.jvm`,
pushes `ghcr.io/<owner>/groupys-api`, and runs the full stack
(`groupys-api` + `groupys-db` + `groupys-minio` + `groupys-redis`) from
`docker/docker-compose.api.prod.yaml` on the VM88 host over SSH. The web app
deploys separately from `docker/docker-compose.web.prod.yaml`; both files share
the `groupys-prod` compose project so container names and volumes stay consistent.

### GitHub Actions secrets to create

Reuses the existing web deploy secrets `VM88_HOST`, `VM88_USER`,
`VM88_SSH_PRIVATE_KEY`, `DEPLOY_PATH`. **Add** these:

| Secret | Notes |
| --- | --- |
| `POSTGRES_USER` | DB user (not `app`) |
| `POSTGRES_PASSWORD` | strong random |
| `POSTGRES_DB` | optional; defaults to `db` |
| `MINIO_ROOT_USER` | **not** `admin` (StartupConfigValidator rejects `admin` in prod) |
| `MINIO_ROOT_PASSWORD` | strong random |
| `JWT_ISSUER` | Clerk issuer URL, e.g. `https://<your>.clerk.accounts.dev` |
| `JWT_PUBLIC_KEY_LOCATION` | Clerk JWKS endpoint, e.g. `<issuer>/.well-known/jwks.json` |
| `APP_CORS_ORIGINS` | real frontend origin(s), comma-separated. **No `localhost`** — boot fails otherwise |
| `ENCRYPTION_MASTER_KEY` | **freshly generated**, NOT the dev fallback. `openssl rand -base64 32` |
| `APPLE_TEAM_ID` | Apple Music dev token signing |
| `APPLE_KEY_ID` | Apple Music dev token signing |
| `APPLE_PRIVATE_KEY` | Apple Music `.p8` contents |
| `APPLE_MEDIA_ID` | Apple Music media id |
| `GROUPYS_ADMIN_SECRET` | hot-takes/admin secret |

### Notes
- `FLYWAY_MIGRATE_AT_START=true`, `QUARKUS_PROFILE=prod`, `REDIS_HOSTS`, and the
  `groupys-db` / `groupys-minio` host overrides are set as literals in the compose
  file — no secrets needed.
- Prod uses Hibernate `validate` + Flyway migrations V1–V5. First boot applies them.
- TLS/reverse-proxy: the API binds `127.0.0.1:8080`. Front it with the existing
  reverse proxy and give it the public origin used in `APP_CORS_ORIGINS` and in the
  mobile `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WS_URL`.
- Health probe: `GET /api/q/health/ready`. Metrics: `GET /api/q/metrics`.
- Rate limiting now degrades to a per-instance in-memory limiter if Redis is down
  (no longer fully fail-open). Distributed limiting resumes when Redis recovers.

---

## 2. Mobile (Expo / EAS)

Code is App-Store-ready; the gaps are EAS config values.

### a. EAS project id (push notifications no-op without it)
```bash
cd mobile
eas init           # creates/links the EAS project
```
Then add the returned id to `mobile/app.json`:
```json
{ "expo": { "extra": { "eas": { "projectId": "<project-id>" } } } }
```
Without it `registerForPushNotificationsAsync()` silently returns null
(`mobile/lib/notifications.ts`).

### b. Production env via EAS (do NOT commit these)
```bash
cd mobile
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value "https://<api-host>/api"
eas env:create --environment production --name EXPO_PUBLIC_WS_URL  --value "wss://<api-host>/api/ws/chat"
eas env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..."
eas env:create --environment production --name EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME --value "<reversed-client-id>"
```
The local `.env` (localhost + `pk_test_`) is dev-only. `eas.json`
`build.production.env` intentionally holds only the non-secret
`EXPO_PUBLIC_ENABLE_APPLE_MUSIC_SIMULATOR_MOCK=false`.

### c. APNs key (push won't deliver without it)
```bash
cd mobile
eas credentials      # iOS → upload/generate APNs key
```
Push does not work in Expo Go or the simulator — needs an EAS build on a physical device.

### d. Submit credentials in `mobile/eas.json`
- iOS: replace `YOUR_APPLE_ID_EMAIL`, `YOUR_APP_STORE_CONNECT_APP_ID`, `YOUR_APPLE_TEAM_ID`.
- Android: drop the Play Store service-account JSON at the `serviceAccountKeyPath`
  (`./play-store-service-account.json`, gitignored) or adjust the path.

### e. Build & submit
```bash
cd mobile
eas build --platform all --profile production
eas submit --platform ios --profile production
eas submit --platform android --profile production   # once the SA key is in place
```

---

## 3. Post-deploy smoke test
1. `curl https://<api-host>/api/q/health/ready` → `UP`.
2. Sign in on a production build; confirm an authenticated call (e.g. profile load) succeeds.
3. Send a chat message between two accounts (WebSocket `wss://<api-host>/api/ws/chat`).
4. Trigger a push (new match/message) to a physical device.
5. File a report and block a user; confirm both persist (moderation endpoints).
