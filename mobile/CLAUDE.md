# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expo (SDK 54) React Native app using React 19 with New Architecture enabled and React Compiler. Part of a monorepo (`web/`, `mobile/`, `backend/`, `docker/`). See root `AGENTS.md` for cross-module guidelines.

## Commands

Run all commands from the `mobile/` directory.

- `npm start` — start Expo dev server
- `npm run ios` / `npm run android` / `npm run web` — run on specific platform
- `npm run lint` — ESLint (flat config, `eslint-config-expo`)

No test runner is configured. Verify changes with lint and manual testing.

## Architecture

**Routing:** Expo Router (file-based). Screens go in `app/`. Uses typed routes (`experiments.typedRoutes`).

**Styling:** NativeWind v4 (Tailwind CSS for React Native). Tailwind config scans `app/**` and `components/**`. Global styles imported via `@/global.css` in the root layout. Use Tailwind `className` props, not inline `style` objects.

**Auth:** Clerk (`@clerk/expo`) with `expo-secure-store` token caching. Route groups: `(auth)/` for unauthenticated screens, `(home)/` for protected screens. Each group's `_layout.tsx` handles redirects via `useAuth`.

**State management:** Zustand (installed, not yet wired up).

**Server state:** TanStack React Query v5 (installed, not yet wired up).

**Path alias:** `@/*` maps to project root (e.g., `@/components/Foo`).

## Key Config

- `app.json` — Expo config (new arch, React Compiler, typed routes)
- `tailwind.config.js` — NativeWind preset, content paths
- `babel.config.js` — `babel-preset-expo` + `nativewind/babel`
- `metro.config.js` — wrapped with `withNativeWind`

## Conventions

- TypeScript strict mode, 2-space indentation
- React components: PascalCase. Utility modules: camelCase
- Commits follow Conventional Commits with scope: `feat(mobile): ...`, `fix(mobile): ...`
- Lint before opening PRs
