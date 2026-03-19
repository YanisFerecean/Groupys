# Repository Guidelines

## Project Structure & Module Organization
- `web/`: Next.js 16 frontend. App Router files live in `web/src/app`, reusable UI in `web/src/components`, and static assets in `web/public`.
- `mobile/`: Expo app. Route screens live in `mobile/app`, and bundled images live in `mobile/assets/images`.
- `backend/quarkus-groupys/`: Quarkus API. Java sources live under `src/main/java/com/groupys`, configuration is in `src/main/resources`, and tests belong in `src/test/java`.
- `docker/`: Local infrastructure, currently PostgreSQL and MinIO via `docker-compose.yaml`.

## Build, Test, and Development Commands
Run commands from each module; there is no root task runner yet.

- `cd web && npm run dev`: start the Next.js dev server.
- `cd web && npm run build && npm run lint`: build and lint the web app.
- `cd mobile && npm run start`: start Expo locally. Use `npm run android`, `npm run ios`, or `npm run web` for a target platform.
- `cd mobile && npm run lint`: run Expo ESLint checks.
- `cd backend/quarkus-groupys && ./mvnw quarkus:dev`: start the backend with live reload.
- `cd backend/quarkus-groupys && ./mvnw test` or `./mvnw package`: run tests or build the service.
- `cd docker && docker compose up -d`: start local Postgres and MinIO.

## Coding Style & Naming Conventions
- TypeScript and TSX use 2-space indentation.
- Java should follow standard 4-space indentation and package names under `com.groupys`.
- React components and Java classes use PascalCase. Utility modules use camelCase. Route files stay framework-native, such as `page.tsx`, `layout.tsx`, and `_layout.tsx`.
- Lint before opening a PR. The active configs are `web/eslint.config.mjs` and `mobile/eslint.config.js`.

## Testing Guidelines
Backend testing is set up with Quarkus JUnit and Rest Assured, but no committed test classes exist yet. Add backend tests in `backend/quarkus-groupys/src/test/java`. Frontend and mobile test runners are not configured yet, so run lint and document manual verification in the PR.

## Commit & Pull Request Guidelines
Follow the existing Conventional Commit pattern seen in history: `feat(mobile): init expo project`, `fix: ...`, `feat(backend): ...`. Keep scopes short and package-specific when helpful.

PRs should include a clear summary, linked issue or task, test or lint results, and screenshots or recordings for `web/` and `mobile/` UI changes. For backend or Docker changes, note any new ports, env vars, or setup steps.

## Security & Configuration Tips
Treat the credentials in `docker/docker-compose.yaml` as local-only defaults. Keep real secrets out of Git and prefer environment variables, matching `backend/quarkus-groupys/src/main/resources/application.properties`.
