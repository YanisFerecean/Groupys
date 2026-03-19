# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies (use npm with the checked-in `package-lock.json`)
- `npm run dev` — start dev server at http://localhost:3000
- `npm run build` — production build (also catches type errors)
- `npm run lint` — run ESLint
- `npm run start` — serve the production build

No test runner is configured yet. Use `npm run lint` and `npm run build` as pre-PR checks.

## Architecture

Next.js 16 App Router project with React 19, Tailwind CSS v4, and shadcn/ui components.

- `src/app/` — App Router entry points (`layout.tsx`, `page.tsx`, `globals.css`)
- `src/components/ui/` — shadcn/ui primitives (e.g., `button.tsx`) built with Radix UI + CVA
- `src/lib/utils.ts` — shared utilities (`cn` helper using clsx + tailwind-merge)
- `public/` — static assets

**Key libraries:** Zustand (state management), TanStack React Query (server state), Framer Motion (animations), Lucide React (icons).

**Path alias:** `@/*` maps to `./src/*` — use for all internal imports (e.g., `@/components/ui/button`).

## Style Conventions

- TypeScript strict mode, function components only
- 2-space indentation, double quotes
- PascalCase for React components, camelCase for utilities, lowercase filenames for shared modules
- Tailwind utility classes over custom CSS; use design tokens from `globals.css`
- shadcn/ui components use `data-slot` attributes and CVA for variants
- Dark mode via `.dark` class with oklch color tokens

## Commits

Use Conventional Commit prefixes: `feat:`, `fix:`, `chore:`, etc.
