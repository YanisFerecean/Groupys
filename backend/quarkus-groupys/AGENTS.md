# Repository Guidelines

## Project Structure & Module Organization
This directory contains the Quarkus backend for the `groupys-web-app` monorepo. Application code lives in `src/main/java/com/groupys`, currently organized into packages such as `dto`, `model`, `repository`, `service`, and `util`. Runtime configuration and seed data live in `src/main/resources`, especially `application.properties` and `import.sql`. Add tests under `src/test/java`, mirroring the main package structure. Related modules live at `../../web`, `../../mobile`, and `../../docker`.

## Build, Test, and Development Commands
Run commands from `backend/quarkus-groupys`.

- `./mvnw quarkus:dev`: start the API with live reload and Quarkus Dev UI on `http://localhost:8080/q/dev`.
- `./mvnw test`: run unit and integration tests.
- `./mvnw package`: build the runnable JAR in `target/quarkus-app/`.
- `./mvnw package -Dnative`: build a native binary when GraalVM is available.
- `cd ../../docker && docker compose up -d`: start local PostgreSQL and MinIO dependencies.

## Coding Style & Naming Conventions
Use standard Java style with 4-space indentation and packages under `com.groupys`. Class names use PascalCase, methods and fields use camelCase, and constants use UPPER_SNAKE_CASE. Keep layer-specific suffixes explicit, for example `UserRepository`, `UserService`, and `UserResDto`. Prefer small resource, service, and repository classes with clear responsibilities. No formatter is configured here, so keep imports tidy and follow existing Quarkus conventions.

## Testing Guidelines
The backend includes Quarkus test support with Rest Assured. Create tests in `src/test/java/com/groupys/...` and name them `*Test.java`. Prefer focused tests for resources, services, and persistence behavior; use `import.sql` only when seeded data is required for repeatable tests. Run `./mvnw test` before opening a PR.

## Commit & Pull Request Guidelines
Follow the repository’s Conventional Commit style, for example `feat(backend): add user lookup endpoint` or `fix(ci): #6`. Keep scopes short and relevant. PRs should include a summary, linked issue or task, test results, and notes for any API, database, env var, or port changes. Include request or response examples when endpoint behavior changes.

## Security & Configuration Tips
Treat values in local Docker and `application.properties` files as development defaults only. Do not commit real secrets; prefer environment variables or profile-specific overrides for sensitive configuration.
