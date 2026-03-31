# Groupys — Project Overview

A music-centric social platform for discovering music, connecting with others based on taste, and sharing music content.

## Tech Stack

| Layer | Technology |
|---|---|
| Web frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4 |
| Mobile | Expo SDK 54, React Native 0.81.5, TypeScript ~5.9, NativeWind v4 |
| Backend | Quarkus 3.32.4, Java 25, JAX-RS, Hibernate ORM + Panache |
| Database | PostgreSQL 18 with pgvector extension |
| Object storage | MinIO (S3-compatible) |
| Cache | Redis 7 |
| Auth | Clerk (JWT-based; `@clerk/nextjs`, `@clerk/expo`, SmallRye JWT on backend) |

## Architecture

```
┌──────────────────────┐   ┌──────────────────────┐
│   web/ (Next.js)     │   │  mobile/ (Expo RN)    │
│   Port 3000          │   │  Expo Router v6        │
└─────────┬────────────┘   └──────────┬────────────┘
          │  REST + WebSocket          │  REST
          ▼                            ▼
┌────────────────────────────────────────────────────┐
│        backend/quarkus-groupys  (Port 8080)        │
│   Resources → Services → Repositories (Panache)    │
│   External APIs: Deezer, Last.FM, Spotify          │
└──────────────────┬─────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
  PostgreSQL    MinIO      Redis
   (pgvector)  (media)   (cache/presence)
```

## Entry Points & Dev Commands

```bash
cd docker && docker compose up -d           # start infra (Postgres, MinIO, Redis)
cd backend/quarkus-groupys && ./mvnw quarkus:dev   # API on :8080
cd web && npm run dev                       # web on :3000
cd mobile && npm run start                  # Expo dev server
```

## Key Subsystems

- [Web frontend](web/README.md)
- [Mobile app](mobile/README.md)
- [Backend API](backend/README.md)
- [Infrastructure](docker/README.md)

## Environment Variables (Production)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `RESEND_API_KEY` | Transactional email |
| `LASTFM_API_KEY` | Last.FM music data |
| `SPOTIFY_CLIENT_ID/SECRET` | Spotify integration |
| `WEB_IMAGE` | Docker image URI for web service |
